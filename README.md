# Entropy Engine

Entropy Engine is a multi-agent system designed to automate biomedical research tasks. It aggregates data from various sources like ClinicalTrials.gov, OpenFDA, UniProt, and PubMed to provide comprehensive insights into drugs, genes, and scientific literature.

## Getting Started

Follow these steps to set up and run the engine locally.

### Prerequisites

- Python 3.10 or higher
- `pip` package manager

### Installation

1. Navigate to the `engine` directory.
2. Create a virtual environment:
   ```bash
   python3 -m venv venv
   ```
3. Activate the virtual environment:
   ```bash
   source venv/bin/activate
   ```
4. Install the dependencies:
   ```bash
   pip install fastapi uvicorn httpx tenacity pydantic
   ```

### Running the Engine

To start the server, ensure you are in the project root directory and the virtual environment is active.

1. Set the python path to the current directory:
   ```bash
   export PYTHONPATH=$PWD
   ```
2. Run the main application:
   ```bash
   python3 engine/main.py
   ```

The server will start listening on `http://0.0.0.0:8000`.

## API Documentation

The engine exposes several endpoints to interact with its agents.

### 1. Health Check

Verifies that the server is up and running.

- **Endpoint**: `GET /`
- **Inputs**: None
- **Output**: JSON object with a status message.

### 2. Clinical Trials Search

Searches for clinical trials using the Clinical Trials Scout.

- **Endpoint**: `GET /search`
- **Inputs**:
  - `term` (required): The search keyword (e.g., "Diabetes").
  - `limit` (optional): Maximum number of results (default: 10).
- **Output**: A list of clinical trials matching the search term.

### 3. Drug Safety Check

Retrieves safety reports and adverse event data using the Hawk Agent (OpenFDA).

- **Endpoint**: `GET /safety`
- **Inputs**:
  - `drug` (required): Brand name of the drug (e.g., "Keytruda").
- **Output**: Safety summary including adverse events and manufacturer information.

### 4. Target Validation

Analyzes gene targets using the Biologist Agent (UniProt & Open Targets).

- **Endpoint**: `GET /validate`
- **Inputs**:
  - `gene` (required): Gene symbol (e.g., "EGFR").
- **Output**: Detailed analysis including cellular location, mechanism of action, pleiotropy risk, and associated pathways.

### 5. Literature Search

Searches PubMed for scientific papers using the Librarian Agent.

- **Endpoint**: `GET /literature`
- **Inputs**:
  - `term` (required): Disease or topic (e.g., "Glioblastoma").
  - `year` (optional): Publication year (default: 2024).
  - `limit` (optional): Number of papers to retrieve (default: 5).
- **Output**: A list of papers containing titles, journals, publication dates, structured abstracts, and direct PubMed links.

## Testing

You can test the API using `curl` or any API client like Postman.

**Example: Literature Search**
```bash
curl "http://localhost:8000/literature?term=Immunotherapy&year=2024&limit=3"
```
