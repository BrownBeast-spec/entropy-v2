import json
from dataclasses import dataclass
from typing import List, Dict, Any, Optional

@dataclass
class TestCase:
    id: str
    query: str
    expected_agents: List[str]
    expected_steps: Optional[List[Dict[str, Any]]] = None
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class Dataset:
    def __init__(self, data_path: str):
        self.data_path = data_path
        self.test_cases: List[TestCase] = []
        self.load()

    def load(self):
        try:
            with open(self.data_path, 'r') as f:
                data = json.load(f)
                for item in data:
                    self.test_cases.append(TestCase(
                        id=item.get("id"),
                        query=item.get("query"),
                        expected_agents=item.get("expected_agents", []),
                        expected_steps=item.get("expected_steps"),
                        description=item.get("description"),
                        metadata=item.get("metadata")
                    ))
        except FileNotFoundError:
            print(f"Dataset file not found at {self.data_path}")
            self.test_cases = []

    def save(self):
        data = []
        for tc in self.test_cases:
            data.append({
                "id": tc.id,
                "query": tc.query,
                "expected_agents": tc.expected_agents,
                "expected_steps": tc.expected_steps,
                "description": tc.description,
                "metadata": tc.metadata
            })
        with open(self.data_path, 'w') as f:
            json.dump(data, f, indent=2)

    def add_case(self, query: str, expected_agents: List[str], expected_steps: Optional[List[Dict[str, Any]]] = None, description: str = ""):
        new_id = f"tc_{len(self.test_cases) + 1:03d}"
        self.test_cases.append(TestCase(
            id=new_id,
            query=query,
            expected_agents=expected_agents,
            expected_steps=expected_steps,
            description=description
        ))
        self.save()
