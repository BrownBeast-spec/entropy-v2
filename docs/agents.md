| **Agent** | **Resource** | **URL to Copy** |
| --- | --- | --- |
| **~~Scout~~** | ClinicalTrials | `https://clinicaltrials.gov/api/v2/studies?query.cond=Glioblastoma` |
| **~~Hawk~~** | OpenFDA | `https://api.fda.gov/drug/label.json?limit=1` |
| **~~Bio~~** | Open Targets | `https://api.platform.opentargets.org/api/v4/graphql` (POST) |
| **~~Bio~~** | UniProt | `https://rest.uniprot.org/uniprotkb/search?query=gene:EGFR` |
| **Bio** | Reactome | `https://reactome.org/ContentService/data/entity/P00533/pathways` |
| **Lib** | PubMed | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=cancer` |
|  |  |  |
|  |  |  |

### **1. Scout Agent (Competition & Trials)**

*Resource: ClinicalTrials.gov (The official US Registry)*

- **Website:** [clinicaltrials.gov](https://clinicaltrials.gov/)
- **API Documentation:** [https://clinicaltrials.gov/data/api](https://www.google.com/search?q=https://clinicaltrials.gov/data/api)
- **Postman Test (GET):**Plaintext
    
    Copy this URL into Postman to find active Glioblastoma trials.
    
    `https://clinicaltrials.gov/api/v2/studies?query.cond=Glioblastoma&filter.overallStatus=RECRUITING&pageSize=5`
    
- **What to check:** Look for a JSON response with a `studies` array containing entries like `NCT0...`.

---

### **2. Hawk Agent (Safety & Regulations)**

*Resource: OpenFDA (Drug Labels & Adverse Events)*

- **Website:** [open.fda.gov](https://open.fda.gov/)
- **API Documentation:** https://open.fda.gov/apis/drug/label/
- **Postman Test (GET):**Plaintext
    
    Copy this to check for a "Boxed Warning" on the drug Keytruda.
    
    `https://api.fda.gov/drug/label.json?search=openfda.brand_name:Keytruda&limit=1`
    
- **What to check:** Look for `results[0].boxed_warning` in the JSON.

---

### **3. Biologist Agent (Scientific Validation)**

*Resource: Open Targets Platform (Genetics & Diseases)*

- **Website:** [platform.opentargets.org](https://platform.opentargets.org/)
- **API Documentation:** https://platform-docs.opentargets.org/data-access/graphql-api
- **Postman Test (POST):**GraphQL
    - **Method:** `POST`
    - **URL:** `https://api.platform.opentargets.org/api/v4/graphql`
    - **Body (GraphQL):** Select "GraphQL" in Postman body and paste this:
    
    `query {
      target(ensemblId: "ENSG00000146648") {
        id
        approvedSymbol
        subcellularLocations {
          location
        }
      }
    }`
    
- **What to check:** You should get a JSON confirming the symbol is `EGFR`.

---

### **4. Biologist / Chemist Agent (Protein Location)**

*Resource: UniProt (Protein Data)*

- **Website:** [uniprot.org](https://www.uniprot.org/)
- **API Documentation:** https://www.uniprot.org/help/api
- **Postman Test (GET):**Plaintext
    
    Find the location of the EGFR protein.
    
    `https://rest.uniprot.org/uniprotkb/search?query=accession:P00533&fields=subcellular_location`
    
- **What to check:** Look for `subcellularLocation` in the response.

---

### **5. Biologist Agent (Pathways)**

*Resource: Reactome (Biological Pathways)*

- **Website:** [reactome.org](https://reactome.org/)
- **API Documentation:** https://reactome.org/ContentService/
- **Postman Test (GET):**Plaintext
    
    Get pathways for a specific protein ID (UniProt ID `P00533` is EGFR).
    
    `https://reactome.org/ContentService/data/entity/P00533/pathways`
    
- **What to check:** A list of pathways like "Signaling by EGFR."

---

### **6. Librarian Agent (Literature)**

*Resource: PubMed / NCBI E-utilities*

- **Website:** [pubmed.ncbi.nlm.nih.gov](https://pubmed.ncbi.nlm.nih.gov/)
- **API Documentation:** https://www.ncbi.nlm.nih.gov/books/NBK25499/
- **Postman Test (GET):**Plaintext
    
    Search for IDs of papers about "Glioblastoma" from 2024.
    
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=Glioblastoma&retmode=json`
    
- **What to check:** A list of IDs under `esearchresult.idlist`.

---

### **7. Auditor Agent (Failed Drugs - The "Cold Storage")**

*Resource: repoDB*

- **Website:** [repoDB Portal](http://apps.chiragjpgroup.org/repoDB/)
- **Endpoint (Download):** This is **NOT** an API. It is a file URL.
- **Postman Test (GET):**Plaintext
    
    Check if the CSV download link is active.
    
    `http://apps.chiragjpgroup.org/repoDB/download/full_data.csv`
    
- **What to check:** Postman will just try to download a file or show header `200 OK`. *Note: You will load this into Postgres later.*

---

### **8. Auditor Agent (Patents - External Wrapper)**

*Resource: Google Patents (via SerpApi)*

- **Website:** [serpapi.com/google-patents-api](https://serpapi.com/google-patents-api)
- **Note:** You need a free API key from SerpApi for this.
- **Postman Test (GET):**Plaintext
    
    `https://serpapi.com/search.json?engine=google_patents&q=Glioblastoma&api_key=YOUR_API_KEY`
    

### **Summary Checklist for Postman**

| **Agent** | **Resource** | **URL to Copy** |
| --- | --- | --- |
| **Scout** | ClinicalTrials | `https://clinicaltrials.gov/api/v2/studies?query.cond=Glioblastoma` |
| **Hawk** | OpenFDA | `https://api.fda.gov/drug/label.json?limit=1` |
| **Bio** | Open Targets | `https://api.platform.opentargets.org/api/v4/graphql` (POST) |
| **Bio** | UniProt | `https://rest.uniprot.org/uniprotkb/search?query=gene:EGFR` |
| **Bio** | Reactome | `https://reactome.org/ContentService/data/entity/P00533/pathways` |
| **Lib** | PubMed | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=cancer` |