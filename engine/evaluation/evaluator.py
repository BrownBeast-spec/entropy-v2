import asyncio
import json
import time
from typing import List, Dict, Any
from datetime import datetime
from pathlib import Path
from engine.middleware.planner import Planner
from engine.evaluation.dataset import Dataset, TestCase

class Evaluator:
    def __init__(self, planner: Planner, dataset: Dataset, output_dir: str = "engine/evaluation/results"):
        self.planner = planner
        self.dataset = dataset
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def evaluate_case(self, test_case: TestCase) -> Dict[str, Any]:
        print(f"Running test case: {test_case.id}")
        start_time = time.time()
        try:
            # Plan generating
            plan = self.planner.plan(test_case.query)
            duration = time.time() - start_time
            
            # Extract agents found
            agents_found = {step.get("agent") for step in plan}
            expected_agents = set(test_case.expected_agents)
            
            # Metrics for Agents
            precision = len(agents_found.intersection(expected_agents)) / len(agents_found) if agents_found else 0
            recall = len(agents_found.intersection(expected_agents)) / len(expected_agents) if expected_agents else 0
            f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
            
            # Step Verification
            steps_matched = 0
            output_steps_match = True
            
            if test_case.expected_steps:
                # If expected steps are provided, perform detailed check
                matched_indices = set()
                for expected_step in test_case.expected_steps:
                    found = False
                    for i, step in enumerate(plan):
                        if i in matched_indices:
                            continue
                        if self._is_step_match(expected_step, step):
                            matched_indices.add(i)
                            found = True
                            steps_matched += 1
                            break
                    if not found:
                        output_steps_match = False
                
                # Check strict count? For now, just ensuring all expected steps are present.
                # If plan has EXTRA steps, is that a failure? Maybe not.
                success = output_steps_match
            else:
                # Fallback to agent coverage
                success = recall == 1.0
            
            # Additional metric: Steps Recall
            total_expected_steps = len(test_case.expected_steps) if test_case.expected_steps else 0
            steps_recall = steps_matched / total_expected_steps if total_expected_steps > 0 else (1.0 if success else 0.0)

            return {
                "case_id": test_case.id,
                "query": test_case.query,
                "success": success,
                "metrics": {
                    "agent_precision": precision,
                    "agent_recall": recall,
                    "agent_f1": f1,
                    "steps_recall": steps_recall,
                    "latency_ms": round(duration * 1000, 2)
                },
                "expected_agents": list(expected_agents),
                "generated_plan": plan,
                "agents_found": list(agents_found),
                "error": None
            }

        except Exception as e:
            return {
                "case_id": test_case.id,
                "query": test_case.query,
                "success": False,
                "metrics": {
                    "agent_precision": 0,
                    "agent_recall": 0,
                    "agent_f1": 0,
                    "steps_recall": 0,
                    "latency_ms": 0
                },
                "expected_agents": test_case.expected_agents,
                "generated_plan": None,
                "agents_found": [],
                "error": str(e)
            }

    def _is_step_match(self, expected: Dict[str, Any], actual: Dict[str, Any]) -> bool:
        # Check Agent
        if expected.get("agent") != actual.get("agent"):
            return False
            
        # Check Function
        if expected.get("function") != actual.get("function"):
            return False
            
        # Check Args (Subset match)
        expected_args = expected.get("args", {})
        actual_args = actual.get("args", {})
        
        for k, v in expected_args.items():
            if k not in actual_args or str(actual_args[k]) != str(v):
                # Note: strict string comparison for now.
                # Might need softer comparison for different types.
                return False
                
        return True

    def run(self):
        results = []
        summary = {
            "total": 0,
            "passed": 0,
            "failed": 0,
            "avg_latency": 0
        }
        
        total_latency = 0
        
        for case in self.dataset.test_cases:
            result = self.evaluate_case(case)
            results.append(result)
            
            summary["total"] += 1
            if result["success"]:
                summary["passed"] += 1
            else:
                summary["failed"] += 1
            
            if result["metrics"]:
                total_latency += result["metrics"]["latency_ms"]
                
        if summary["total"] > 0:
            summary["avg_latency"] = total_latency / summary["total"]

        self._save_results(results, summary)
        return summary, results

    def _save_results(self, results, summary):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = self.output_dir / f"eval_run_{timestamp}.json"
        
        final_report = {
            "timestamp": timestamp,
            "summary": summary,
            "details": results
        }
        
        with open(output_file, 'w') as f:
            json.dump(final_report, f, indent=2)
            
        print(f"\nEvaluation Complete. Results saved to {output_file}")
        print(f"Passed: {summary['passed']}/{summary['total']}")
        print(f"Avg Latency: {summary['avg_latency']:.2f}ms")
