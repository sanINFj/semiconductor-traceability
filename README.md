# WaferIQ: AI-Enhanced Semiconductor Traceability and Quality Intelligence

WaferIQ is a prototype cloud platform for semiconductor manufacturing lot
traceability and yield-deviation analysis. It combines a deterministic
quality-analysis engine with AWS-hosted APIs, persistent records, and an
AI-generated investigation brief for lots flagged by the detector.

## Current capabilities

- Calculate failed dies and final-test yield from lot measurements.
- Compare a lot's yield with the median yield of comparison lots for the same
  product.
- Flag yield drops that meet a configurable percentage-point threshold.
- Generate an investigation brief for alert cases using Amazon Bedrock.
- Store analysis records in Amazon DynamoDB and JSON reports in Amazon S3.
- Use Amazon Cognito for user authentication and notification preferences.
- Integrate Amazon SNS for quality-alert notifications.
- Present analysis results in the existing WaferIQ browser dashboard.
- Evaluate the detector on a deterministic synthetic dataset and compare
  multiple alert thresholds.

## Architecture

1. The browser dashboard submits a lot and comparison lots to Amazon API
   Gateway.
2. AWS Lambda validates the lot and runs the quality-analysis logic.
3. The detector compares observed yield against the same-product comparison
   cohort and assigns a status.
4. For alert cases, Lambda attempts to generate an investigation brief using
   Amazon Bedrock. AI failure should not prevent the base analysis from being
   returned.
5. Analysis data and reports are persisted through the configured AWS services.
6. Cognito-protected preferences routes support authenticated user preferences.

The exact AWS resources and environment variables are account-specific and
must be configured in the deployment environment; credentials are not included
in this repository.

## Technology stack

- Frontend: HTML, CSS, JavaScript
- Backend and analysis: Python
- Cloud: AWS Lambda, API Gateway, DynamoDB, S3, Cognito, SNS, Bedrock
- Tests: Python `unittest`
- Evaluation: Python script, JSON, Markdown and CSV outputs

## Requirements

- Python 3.12 recommended for matching the deployed Lambda runtime.
- AWS CLI v2 for deployment and cloud operations.
- An AWS account with the necessary service permissions for live integration.
- Access to the selected Amazon Bedrock model in the configured region for
  AI investigation generation.

The local detector tests and synthetic evaluation do not require AWS access.

## Run locally

From the repository root:

```bash
python3 -m unittest discover -s backend/tests -v
python3 -m backend.quality_engine.run_analysis
python3 scripts/evaluate_detector.py
```

The evaluation script writes its outputs under `build/evaluation/`:

- `evaluation_report.md`
- `evaluation_report.json`
- `threshold_metrics.csv`
- `lot_predictions.csv`

These files are generated artifacts and are excluded from version control by
default. Regenerate them when you need fresh results.

## Run the dashboard

From the repository root:

```bash
python3 -m http.server 8000 --directory frontend
```

Open <http://localhost:8000> in your browser.

Live API calls require the configured backend endpoint and the appropriate
AWS services. Do not place AWS credentials or secrets in frontend code.

## Evaluation results

The current synthetic benchmark evaluates 60 lots: 54 labeled normal and 6
with injected yield-deviation scenarios.

At a 5-percentage-point alert threshold, the current benchmark reports:

- True positives: 6
- False positives: 0
- True negatives: 54
- False negatives: 0
- Precision: 1.00
- Recall: 1.00
- F1 score: 1.00

At 7 percentage points, recall falls to 0.50; at 10 percentage points, none
of the six injected anomaly cases is detected.

These are results on the current synthetic dataset, not evidence of
performance on real manufacturing data. The comparison cohort includes other
labeled anomaly lots, and thresholds were evaluated on the same dataset rather
than an independent holdout set. The results should therefore be treated as
an initial prototype benchmark, not production validation.

## Responsible interpretation

A yield alert indicates a deviation from the selected comparison baseline; it
does not establish a physical defect mechanism or root cause. AI-generated
investigation text is guidance for engineering review and must be validated
against equipment logs, recipe history, test conditions and other evidence.

## Repository structure

```text
backend/
  lambda_functions/   AWS Lambda handler
  quality_engine/     Lot validation and yield analysis
  tests/              Unit tests
frontend/
  index.html           WaferIQ dashboard
  vendor/              Vendored browser dependency
sample_data/           Synthetic lot data and scenario metadata
scripts/
  generate_dataset.py  Synthetic dataset generator
  evaluate_detector.py Threshold evaluation and report generation
docs/                  Project documentation
```

## Security and cost notes

- Never commit AWS credentials, tokens, private keys, or account-specific
  secrets.
- Configure environment variables and IAM permissions in the deployment
  environment.
- Bedrock inference, API requests, storage and other AWS usage may incur costs.
- Use synthetic data for demonstrations unless authorized real data is
  available.

## Project status

Functional prototype with automated unit tests, synthetic threshold
evaluation, a browser dashboard, and a deployed AWS integration. Further work
includes broader failure-path testing, independent evaluation data, and
validation against representative manufacturing data.
