-- SPEC-059 · Reusable Agent Governance & AgentOps Framework
-- BigQuery analytical plane. Replace `${PROJECT_ID}.${DATASET}` before execution.

CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.agent_runs` (
  agent_system_id STRING NOT NULL,
  agent_id STRING,
  deployment_id STRING,
  run_id STRING NOT NULL,
  trace_id STRING,
  session_id STRING,
  environment STRING NOT NULL,
  status STRING NOT NULL,
  requested_by STRING,
  started_at TIMESTAMP NOT NULL,
  finished_at TIMESTAMP,
  duration_ms INT64,
  error_code STRING,
  error_message STRING,
  metadata JSON,
  ingested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(started_at)
CLUSTER BY agent_system_id, agent_id, status, run_id;

CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.agent_run_steps` (
  run_id STRING NOT NULL,
  trace_id STRING,
  step_id STRING NOT NULL,
  parent_step_id STRING,
  agent_id STRING,
  step_type STRING NOT NULL,
  tool_name STRING,
  execution_mode STRING,
  status STRING NOT NULL,
  started_at TIMESTAMP NOT NULL,
  finished_at TIMESTAMP,
  duration_ms INT64,
  metadata JSON,
  ingested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(started_at)
CLUSTER BY agent_id, step_type, execution_mode, run_id;

CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.agent_llm_usage` (
  agent_system_id STRING NOT NULL,
  run_id STRING NOT NULL,
  trace_id STRING,
  session_id STRING,
  agent_id STRING NOT NULL,
  model_provider STRING NOT NULL,
  model_name STRING NOT NULL,
  request_count INT64 NOT NULL,
  input_tokens INT64,
  output_tokens INT64,
  total_tokens INT64,
  latency_ms INT64,
  status STRING NOT NULL,
  error_code STRING,
  error_message STRING,
  requested_by STRING,
  observed_at TIMESTAMP NOT NULL,
  billing_reference STRING,
  metadata JSON,
  ingested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(observed_at)
CLUSTER BY agent_system_id, agent_id, model_name, run_id;

CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.agent_artifacts` (
  artifact_id STRING NOT NULL,
  run_id STRING NOT NULL,
  agent_id STRING,
  artifact_type STRING NOT NULL,
  name STRING,
  uri STRING,
  content_type STRING,
  checksum STRING,
  created_at TIMESTAMP NOT NULL,
  metadata JSON,
  ingested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(created_at)
CLUSTER BY agent_id, artifact_type, run_id;

CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.agent_evaluation_evidence` (
  evaluation_id STRING NOT NULL,
  run_id STRING NOT NULL,
  agent_id STRING,
  profile_type STRING NOT NULL,
  metric_name STRING,
  metric_value FLOAT64,
  metric_unit STRING,
  status STRING NOT NULL,
  evidence_uri STRING,
  evaluated_at TIMESTAMP NOT NULL,
  metadata JSON,
  ingested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(evaluated_at)
CLUSTER BY profile_type, agent_id, status, run_id;

CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.agent_alerts` (
  alert_id STRING NOT NULL,
  agent_system_id STRING,
  agent_id STRING,
  run_id STRING,
  alert_type STRING,
  severity STRING NOT NULL,
  title STRING NOT NULL,
  message STRING,
  source STRING NOT NULL,
  created_at TIMESTAMP NOT NULL,
  acknowledged BOOL NOT NULL DEFAULT FALSE,
  acknowledged_by STRING,
  acknowledged_at TIMESTAMP,
  ingested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(created_at)
CLUSTER BY severity, acknowledged, agent_id, alert_type;

CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.agent_health_snapshots` (
  agent_system_id STRING NOT NULL,
  component STRING NOT NULL,
  status STRING NOT NULL,
  latency_ms FLOAT64,
  detail STRING,
  checked_at TIMESTAMP NOT NULL,
  metadata JSON,
  ingested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(checked_at)
CLUSTER BY agent_system_id, component, status;

CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.agent_cost_attribution` (
  cost_record_id STRING NOT NULL,
  agent_system_id STRING,
  agent_id STRING,
  run_id STRING,
  service STRING,
  sku STRING,
  cost_semantics STRING NOT NULL, -- billed | attributed | unattributed
  amount NUMERIC,
  currency STRING NOT NULL,
  attribution_method STRING,
  confidence STRING,
  billing_export_reference STRING,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL,
  ingested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(period_start)
CLUSTER BY agent_system_id, agent_id, cost_semantics, service;
