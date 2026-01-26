import json
from core.clinical_trials import ClinicalTrialsResponse

sample_json = {
    "studies": [
        {
            "protocolSection": {
                "identificationModule": {
                    "nctId": "NCT00695604",
                    "orgStudyIdInfo": {
                        "id": "15322B"
                    },
                    "organization": {
                        "fullName": "University of Chicago",
                        "class": "OTHER"
                    },
                    "briefTitle": "Repeated High-dose Inhaled Corticosteroids for Asthma",
                    "officialTitle": "Repeated High-dose Inhaled Corticosteroids for Asthma",
                    "acronym": "ReHICS"
                },
                "statusModule": {
                    "statusVerifiedDate": "2018-05",
                    "overallStatus": "WITHDRAWN",
                    "whyStopped": "Study was not able to be completed, no results analyzed.",
                    "startDateStruct": {
                        "date": "2008-05",
                        "type": "ACTUAL"
                    },
                    "completionDateStruct": {
                        "date": "2011-09",
                        "type": "ACTUAL"
                    }
                },
                "descriptionModule": {
                    "briefSummary": "The purpose of this study is to to compare the effects..."
                },
                "conditionsModule": {
                    "conditions": ["Asthma"],
                    "keywords": ["Acute asthma"]
                },
                "designModule": {
                    "studyType": "INTERVENTIONAL",
                    "phases": ["PHASE2"]
                }
            },
            "derivedSection": {
                "miscInfoModule": {
                    "versionHolder": "2026-01-23"
                }
            },
            "hasResults": False
        }
    ],
    "nextPageToken": "ZVNj7o2Elu8o3lpuTcu5t72tmpOQJJxpYPap"
}

try:
    response = ClinicalTrialsResponse(**sample_json)
    print("Successfully parsed response!")
    print(f"Study ID: {response.studies[0].protocolSection.identificationModule.nctId}")
except Exception as e:
    print(f"Failed to parse: {e}")
