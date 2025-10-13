module yieldflow::native_usdc_vault_fa {
    use std::signer;
    use std::option;
    use aptos_framework::timestamp;
    use aptos_framework::account;
    use aptos_framework::event;
    use aptos_framework::fungible_asset::{Self, FungibleAsset, Metadata};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::object::{Self, Object};

    /// Error codes
    const E_ALREADY_INITIALIZED: u64 = 1;
    const E_NOT_INITIALIZED: u64 = 2;
    const E_INVALID_AMOUNT: u64 = 3;
    const E_INSUFFICIENT_BALANCE: u64 = 4;
    const E_NOT_AUTHORIZED: u64 = 5;

    /// Official USDC FA metadata object address (same for mainnet/testnet)
    const USDC_FA_METADATA: address = @0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b;

    struct VaultPosition has key {
        principal: u64,
        yield_earned: u64,
        last_deposit_time: u64,
        last_withdraw_time: u64,
    }

    struct VaultManager has key {
        /// Store the resource account address of the vault
        resource_addr: address,
        /// Store the signer capability for the resource account
        vault_cap: account::SignerCapability,
        total_deposits: u64,
        total_yield: u64,
        admin: address,
    }

    #[event]
    struct DepositEvent has drop, store {
        user: address, amount: u64, ts: u64
    }
    #[event]
    struct WithdrawEvent has drop, store {
        user: address, principal: u64, yield_amount: u64, withdrawn: u64, ts: u64
    }
    #[event]
    struct YieldEvent has drop, store {
        user: address, yield_added: u64, ts: u64
    }

    /// Returns the object handle for USDC FA
    public fun usdc_meta_obj(): Object<Metadata> {
        object::address_to_object<Metadata>(USDC_FA_METADATA)
    }

    /// Only needed for internal/external visibility.
    public fun vault_resource_addr(admin: address): address acquires VaultManager {
        borrow_global<VaultManager>(admin).resource_addr
    }

    /// Initialize vault: creates the resource account and stores its capability/address in VaultManager
    public entry fun initialize(admin: &signer) {
        let seed = b"ai_YieldFlow_usdc_vault";
        let (resource_signer, vault_cap) = account::create_resource_account(admin, seed);
        let resource_addr = signer::address_of(&resource_signer);
        assert!(!exists<VaultManager>(signer::address_of(admin)), E_ALREADY_INITIALIZED);
        move_to(admin, VaultManager {
            resource_addr,
            vault_cap,
            total_deposits: 0,
            total_yield: 0,
            admin: signer::address_of(admin),
        });
    }


    /// Helper for safe signer creation for the resource account
    fun vault_signer(admin_addr: address): signer acquires VaultManager {
        let vault = borrow_global<VaultManager>(admin_addr);
        account::create_signer_with_capability(&vault.vault_cap)
    }

    /// Deposit native USDC FA into vault
    public entry fun deposit(user: &signer, amount: u64, admin_addr: address)
    acquires VaultManager, VaultPosition {
        assert!(amount > 0, E_INVALID_AMOUNT);
        let user_addr = signer::address_of(user);
        assert!(exists<VaultManager>(admin_addr), E_NOT_INITIALIZED);
        let vault = borrow_global_mut<VaultManager>(admin_addr);
        let resource_addr = vault.resource_addr;

        // Withdraw from user's FA store and deposit to vault's FA store
        let fa = primary_fungible_store::withdraw(user, usdc_meta_obj(), amount);
        primary_fungible_store::deposit(resource_addr, fa);

        // Update position
        if (exists<VaultPosition>(user_addr)) {
            let pos = borrow_global_mut<VaultPosition>(user_addr);
            pos.principal += amount;
            pos.last_deposit_time = timestamp::now_seconds();
        } else {
            move_to(user, VaultPosition {
                principal: amount,
                yield_earned: 0,
                last_deposit_time: timestamp::now_seconds(),
                last_withdraw_time: 0,
            });
        };
        vault.total_deposits += amount;
        event::emit(DepositEvent { user: user_addr, amount, ts: timestamp::now_seconds() });
    }

    /// Withdraw USDC FA from vault to user (takes from yield then principal)
    public entry fun withdraw(admin: &signer, user_addr: address, amount: u64)
    acquires VaultManager, VaultPosition {
        let admin_addr = signer::address_of(admin);
        assert!(exists<VaultManager>(admin_addr), E_NOT_INITIALIZED);
        let vault = borrow_global_mut<VaultManager>(admin_addr);
        assert!(signer::address_of(admin) == vault.admin, E_NOT_AUTHORIZED);
        let resource_addr = vault.resource_addr;
        assert!(exists<VaultPosition>(user_addr), E_NOT_INITIALIZED);

        let pos = borrow_global_mut<VaultPosition>(user_addr);
        let balance = pos.principal + pos.yield_earned;
        assert!(amount <= balance, E_INSUFFICIENT_BALANCE);

        let yield_withdrawn = if (amount <= pos.yield_earned) { amount } else { pos.yield_earned };
        let principal_withdrawn = amount - yield_withdrawn;
        pos.yield_earned -= yield_withdrawn;
        pos.principal -= principal_withdrawn;
        pos.last_withdraw_time = timestamp::now_seconds();

        // Obtain signer for the vault resource account, withdraw from its FA store and deposit to user
        let resource_signer = account::create_signer_with_capability(&vault.vault_cap);
        let fa = primary_fungible_store::withdraw(&resource_signer, usdc_meta_obj(), amount);
        primary_fungible_store::deposit(user_addr, fa);

        vault.total_deposits -= principal_withdrawn;
        vault.total_yield -= yield_withdrawn;
        event::emit(WithdrawEvent {
            user: user_addr,
            principal: principal_withdrawn,
            yield_amount: yield_withdrawn,
            withdrawn: amount,
            ts: timestamp::now_seconds(),
        });
    }

    /// Admin can add yield to user vaults
    public entry fun add_yield(admin: &signer, user_addr: address, yield_amount: u64)
    acquires VaultManager, VaultPosition {
        let admin_addr = signer::address_of(admin);
        assert!(exists<VaultManager>(admin_addr), E_NOT_INITIALIZED);
        let vault = borrow_global<VaultManager>(admin_addr);
        assert!(signer::address_of(admin) == vault.admin, E_NOT_AUTHORIZED);
        assert!(exists<VaultPosition>(user_addr), E_NOT_INITIALIZED);

        let pos = borrow_global_mut<VaultPosition>(user_addr);
        pos.yield_earned += yield_amount;
        let vault_mut = borrow_global_mut<VaultManager>(admin_addr);
        vault_mut.total_yield += yield_amount;
        event::emit(YieldEvent { user: user_addr, yield_added: yield_amount, ts: timestamp::now_seconds() });
    }

    #[view]
    public fun get_user_position(user_addr: address): (u64, u64, u64, u64) acquires VaultPosition {
        if (!exists<VaultPosition>(user_addr)) return (0, 0, 0, 0);
        let pos = borrow_global<VaultPosition>(user_addr);
        (pos.principal, pos.yield_earned, pos.last_deposit_time, pos.last_withdraw_time)
    }

    #[view]
    public fun get_vault_stats(admin_addr: address): (u64, u64) acquires VaultManager {
        if (!exists<VaultManager>(admin_addr)) return (0, 0);
        let vault = borrow_global<VaultManager>(admin_addr);
        (vault.total_deposits, vault.total_yield)
    }

    #[view]
    public fun get_total_balance(user_addr: address): u64 acquires VaultPosition {
        if (!exists<VaultPosition>(user_addr)) return 0;
        let pos = borrow_global<VaultPosition>(user_addr);
        pos.principal + pos.yield_earned
    }

    #[test_only]
    public fun init_for_test(admin: &signer) {
        initialize(admin);
    }
}
