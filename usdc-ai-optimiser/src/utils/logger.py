# src/utils/logger.py
"""Centralized logging configuration for AI system"""

import logging
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional
import json

class AILogger:
    """Centralized logger for AI system with structured logging"""
    
    def __init__(self, name: str = "CrossYieldAI", level: str = "INFO"):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(getattr(logging, level.upper()))
        
        # Create formatter
        formatter = logging.Formatter(
            '%(asctime)s | %(name)s | %(levelname)s | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        
        # Remove existing handlers to avoid duplicates
        self.logger.handlers.clear()
        self.logger.addHandler(console_handler)
        
        # Prevent propagation to root logger
        self.logger.propagate = False
    
    def log_ai_start(self, process_name: str, context: Dict[str, Any] = None):
        """Log the start of an AI process"""
        self.logger.info(f"🚀 AI PROCESS STARTED: {process_name}")
        if context:
            self.logger.info(f"   Context: {json.dumps(context, indent=2, default=str)}")
    
    def log_ai_end(self, process_name: str, result: Dict[str, Any] = None, duration: float = None):
        """Log the end of an AI process"""
        self.logger.info(f"🏆 AI PROCESS COMPLETED: {process_name}")
        if duration:
            self.logger.info(f"   Duration: {duration:.2f}s")
        if result:
            self.logger.info(f"   Result: {json.dumps(result, indent=2, default=str)}")
    
    def log_ai_error(self, process_name: str, error: Exception, context: Dict[str, Any] = None):
        """Log AI process errors"""
        self.logger.error(f"❌ AI PROCESS ERROR: {process_name}")
        self.logger.error(f"   Error: {str(error)}")
        if context:
            self.logger.error(f"   Context: {json.dumps(context, indent=2, default=str)}")
    
    def log_agent_analysis(self, agent_name: str, opportunities_count: int, user_profile: Dict[str, Any]):
        """Log agent analysis start"""
        self.logger.info(f"🤖 AGENT ANALYSIS: {agent_name}")
        self.logger.info(f"   Opportunities: {opportunities_count}")
        self.logger.info(f"   User Profile: {json.dumps(user_profile, indent=2, default=str)}")
    
    def log_agent_result(self, agent_name: str, result: Dict[str, Any]):
        """Log agent analysis result"""
        self.logger.info(f"✅ AGENT RESULT: {agent_name}")
        self.logger.info(f"   Expected APY: {result.get('expected_apy', 0):.2f}%")
        self.logger.info(f"   Confidence: {result.get('confidence', 0):.2f}")
        self.logger.info(f"   Strategy Type: {result.get('strategy_type', 'unknown')}")
        if 'allocation' in result:
            self.logger.info(f"   Allocation: {json.dumps(result['allocation'], indent=2)}")
    
    def log_coordination_phase(self, phase: str, details: Dict[str, Any] = None):
        """Log coordination phase"""
        self.logger.info(f"🤝 COORDINATION PHASE: {phase}")
        if details:
            self.logger.info(f"   Details: {json.dumps(details, indent=2, default=str)}")
    
    def log_data_fetch(self, source: str, count: int, duration: float = None):
        """Log data fetching operations"""
        self.logger.info(f"📊 DATA FETCH: {source}")
        self.logger.info(f"   Records: {count}")
        if duration:
            self.logger.info(f"   Duration: {duration:.2f}s")
    
    def log_opportunity_analysis(self, opportunities: List[Dict[str, Any]]):
        """Log opportunity analysis"""
        self.logger.info(f"🔍 OPPORTUNITY ANALYSIS:")
        for i, opp in enumerate(opportunities[:5], 1):  # Log top 5
            self.logger.info(f"   {i}. {opp.get('protocol', 'Unknown')} on {opp.get('chain', 'Unknown')}")
            self.logger.info(f"      APY: {opp.get('apy', 0):.2f}% | Risk: {opp.get('risk_score', 0):.2f}")
    
    def log_allocation_decision(self, allocation: Dict[str, float], reasoning: str = None):
        """Log allocation decisions"""
        self.logger.info(f"💼 ALLOCATION DECISION:")
        for position, weight in allocation.items():
            protocol, chain = position.split('_', 1) if '_' in position else (position, 'unknown')
            self.logger.info(f"   {weight:.1%} → {protocol.upper()} on {chain.upper()}")
        if reasoning:
            self.logger.info(f"   Reasoning: {reasoning}")
    
    def log_llm_interaction(self, prompt_type: str, response_length: int, success: bool):
        """Log LLM interactions"""
        status = "✅" if success else "❌"
        self.logger.info(f"🧠 LLM INTERACTION: {prompt_type}")
        self.logger.info(f"   {status} Response Length: {response_length} chars")
    
    def log_performance_metrics(self, metrics: Dict[str, Any]):
        """Log performance metrics"""
        self.logger.info(f"📈 PERFORMANCE METRICS:")
        for key, value in metrics.items():
            if isinstance(value, float):
                self.logger.info(f"   {key}: {value:.2f}")
            else:
                self.logger.info(f"   {key}: {value}")
    
    def log_system_status(self, status: str, details: Dict[str, Any] = None):
        """Log system status updates"""
        self.logger.info(f"⚙️ SYSTEM STATUS: {status}")
        if details:
            self.logger.info(f"   Details: {json.dumps(details, indent=2, default=str)}")

# Global logger instance
ai_logger = AILogger()

# Convenience functions
def log_ai_start(process_name: str, context: Dict[str, Any] = None):
    ai_logger.log_ai_start(process_name, context)

def log_ai_end(process_name: str, result: Dict[str, Any] = None, duration: float = None):
    ai_logger.log_ai_end(process_name, result, duration)

def log_ai_error(process_name: str, error: Exception, context: Dict[str, Any] = None):
    ai_logger.log_ai_error(process_name, error, context)

def log_agent_analysis(agent_name: str, opportunities_count: int, user_profile: Dict[str, Any]):
    ai_logger.log_agent_analysis(agent_name, opportunities_count, user_profile)

def log_agent_result(agent_name: str, result: Dict[str, Any]):
    ai_logger.log_agent_result(agent_name, result)

def log_coordination_phase(phase: str, details: Dict[str, Any] = None):
    ai_logger.log_coordination_phase(phase, details)

def log_data_fetch(source: str, count: int, duration: float = None):
    ai_logger.log_data_fetch(source, count, duration)

def log_opportunity_analysis(opportunities: List[Dict[str, Any]]):
    ai_logger.log_opportunity_analysis(opportunities)

def log_allocation_decision(allocation: Dict[str, float], reasoning: str = None):
    ai_logger.log_allocation_decision(allocation, reasoning)

def log_llm_interaction(prompt_type: str, response_length: int, success: bool):
    ai_logger.log_llm_interaction(prompt_type, response_length, success)

def log_performance_metrics(metrics: Dict[str, Any]):
    ai_logger.log_performance_metrics(metrics)

def log_system_status(status: str, details: Dict[str, Any] = None):
    ai_logger.log_system_status(status, details)