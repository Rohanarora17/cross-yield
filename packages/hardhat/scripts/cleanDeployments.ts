import * as fs from "fs";
import * as path from "path";

const DEPLOYMENTS_DIR = "./deployments";

function cleanDeployments() {
  if (!fs.existsSync(DEPLOYMENTS_DIR)) {
    console.log("No deployments directory found");
    return;
  }

  const chainDirectories = fs
    .readdirSync(DEPLOYMENTS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const chainName of chainDirectories) {
    const chainDir = path.join(DEPLOYMENTS_DIR, chainName);
    console.log(`Cleaning ${chainName}...`);
    
    const files = fs.readdirSync(chainDir, { withFileTypes: true });
    
    for (const file of files) {
      if (file.isFile()) {
        const filePath = path.join(chainDir, file.name);
        
        // Remove empty files or files with empty names
        if (file.name.length === 0 || file.name === ".json" || file.name.startsWith(".")) {
          try {
            fs.unlinkSync(filePath);
            console.log(`  Removed problematic file: ${file.name}`);
          } catch (error) {
            console.log(`  Failed to remove ${file.name}:`, error);
          }
        }
        
        // Check for empty JSON files
        if (file.name.endsWith(".json")) {
          try {
            const stats = fs.statSync(filePath);
            if (stats.size === 0) {
              fs.unlinkSync(filePath);
              console.log(`  Removed empty file: ${file.name}`);
            }
          } catch (error) {
            console.log(`  Failed to check ${file.name}:`, error);
          }
        }
      }
    }
  }
  
  console.log("✅ Deployment cleanup complete");
}

cleanDeployments();