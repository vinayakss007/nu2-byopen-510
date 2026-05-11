          table_name           |           column_name           |          data_type          | is_nullable |                                  column_default                                  
-------------------------------+---------------------------------+-----------------------------+-------------+----------------------------------------------------------------------------------
 active_impersonation_sessions | id                              | uuid                        | YES         | 
 active_impersonation_sessions | super_admin_id                  | uuid                        | YES         | 
 active_impersonation_sessions | super_admin_email               | text                        | YES         | 
 active_impersonation_sessions | impersonated_user_id            | uuid                        | YES         | 
 active_impersonation_sessions | impersonated_email              | text                        | YES         | 
 active_impersonation_sessions | tenant_id                       | uuid                        | YES         | 
 active_impersonation_sessions | tenant_name                     | text                        | YES         | 
 active_impersonation_sessions | started_at                      | timestamp with time zone    | YES         | 
 active_impersonation_sessions | ip_address                      | inet                        | YES         | 
 active_impersonation_sessions | user_agent                      | text                        | YES         | 
 active_impersonation_sessions | reason                          | text                        | YES         | 
 active_impersonation_sessions | duration_minutes                | numeric                     | YES         | 
 active_workflows_by_trigger   | trigger_type                    | text                        | YES         | 
 active_workflows_by_trigger   | workflow_count                  | bigint                      | YES         | 
 active_workflows_by_trigger   | workflow_ids                    | ARRAY                       | YES         | 
 activities                    | id                              | uuid                        | NO          | gen_random_uuid()
 activities                    | tenant_id                       | uuid                        | NO          | 
 activities                    | user_id                         | uuid                        | YES         | 
 activities                    | entity_type                     | text                        | NO          | 
 activities                    | entity_id                       | uuid                        | NO          | 
 activities                    | action                          | text                        | NO          | 
 activities                    | details                         | jsonb                       | YES         | '{}'::jsonb
 activities                    | ip_address                      | text                        | YES         | 
 activities                    | created_at                      | timestamp with time zone    | NO          | now()
 activities                    | type                            | text                        | YES         | 
 activities                    | deal_id                         | uuid                        | YES         | 
 ai_email_drafts               | id                              | uuid                        | NO          | gen_random_uuid()
 ai_email_drafts               | tenant_id                       | uuid                        | NO          | 
 ai_email_drafts               | contact_id                      | uuid                        | YES         | 
 ai_email_drafts               | deal_id                         | uuid                        | YES         | 
 ai_email_drafts               | purpose                         | text                        | NO          | 
 ai_email_drafts               | subject                         | text                        | NO          | 
 ai_email_drafts               | body                            | text                        | NO          | 
 ai_email_drafts               | variables_used                  | ARRAY                       | YES         | '{}'::text[]
 ai_email_drafts               | tone                            | text                        | YES         | 'professional'::text
 ai_email_drafts               | length                          | text                        | YES         | 'medium'::text
 ai_email_drafts               | metadata                        | jsonb                       | YES         | '{}'::jsonb
 ai_email_drafts               | created_by                      | uuid                        | YES         | 
 ai_email_drafts               | created_at                      | timestamp with time zone    | NO          | now()
 ai_insights                   | id                              | uuid                        | NO          | gen_random_uuid()
 ai_insights                   | tenant_id                       | uuid                        | NO          | 
 ai_insights                   | entity_type                     | text                        | NO          | 
 ai_insights                   | entity_id                       | uuid                        | NO          | 
 ai_insights                   | insight_type                    | text                        | NO          | 
 ai_insights                   | title                           | text                        | NO          | 
 ai_insights                   | description                     | text                        | NO          | 
 ai_insights                   | confidence_score                | numeric                     | YES         | 0
 ai_insights                   | priority                        | text                        | YES         | 'medium'::text
 ai_insights                   | metadata                        | jsonb                       | YES         | '{}'::jsonb
 ai_insights                   | is_read                         | boolean                     | YES         | false
 ai_insights                   | is_actioned                     | boolean                     | YES         | false
 ai_insights                   | created_at                      | timestamp with time zone    | NO          | now()
 ai_insights                   | expires_at                      | timestamp with time zone    | YES         | 
 ai_usage_logs                 | id                              | uuid                        | NO          | gen_random_uuid()
 ai_usage_logs                 | tenant_id                       | uuid                        | NO          | 
 ai_usage_logs                 | user_id                         | uuid                        | YES         | 
 ai_usage_logs                 | feature                         | text                        | NO          | 
 ai_usage_logs                 | model                           | text                        | YES         | 
 ai_usage_logs                 | tokens_input                    | integer                     | YES         | 0
 ai_usage_logs                 | tokens_output                   | integer                     | YES         | 0
 ai_usage_logs                 | cost_cents                      | numeric                     | YES         | 0
 ai_usage_logs                 | duration_ms                     | integer                     | YES         | 0
 ai_usage_logs                 | success                         | boolean                     | YES         | true
 ai_usage_logs                 | error_message                   | text                        | YES         | 
 ai_usage_logs                 | metadata                        | jsonb                       | YES         | '{}'::jsonb
 ai_usage_logs                 | created_at                      | timestamp with time zone    | NO          | now()
 api_key_usage                 | id                              | uuid                        | NO          | gen_random_uuid()
 api_key_usage                 | api_key_id                      | uuid                        | NO          | 
 api_key_usage                 | tenant_id                       | uuid                        | NO          | 
 api_key_usage                 | user_id                         | uuid                        | YES         | 
 api_key_usage                 | endpoint                        | text                        | NO          | 
 api_key_usage                 | method                          | text                        | NO          | 
 api_key_usage                 | status_code                     | integer                     | YES         | 
 api_key_usage                 | ip_address                      | inet                        | YES         | 
 api_key_usage                 | user_agent                      | text                        | YES         | 
 api_key_usage                 | response_time_ms                | integer                     | YES         | 
 api_key_usage                 | created_at                      | timestamp with time zone    | NO          | now()
 api_keys                      | id                              | uuid                        | NO          | gen_random_uuid()
 api_keys                      | tenant_id                       | uuid                        | NO          | 
 api_keys                      | user_id                         | uuid                        | NO          | 
 api_keys                      | key_hash                        | text                        | NO          | 
 api_keys                      | key_prefix                      | text                        | NO          | 
 api_keys                      | name                            | text                        | NO          | ''::text
 api_keys                      | scopes                          | jsonb                       | NO          | '[]'::jsonb
 api_keys                      | is_active                       | boolean                     | YES         | true
 api_keys                      | expires_at                      | timestamp with time zone    | YES         | 
 api_keys                      | last_used_at                    | timestamp with time zone    | YES         | 
 api_keys                      | last_used_ip                    | text                        | YES         | 
 api_keys                      | created_at                      | timestamp with time zone    | NO          | now()
 api_keys_registry             | id                              | uuid                        | NO          | gen_random_uuid()
 api_keys_registry             | service                         | text                        | NO          | 
 api_keys_registry             | key_name                        | text                        | NO          | 
 api_keys_registry             | encrypted_key                   | text                        | NO          | 
 api_keys_registry             | key_prefix                      | text                        | YES         | 
 api_keys_registry             | is_active                       | boolean                     | YES         | true
 api_keys_registry             | is_primary                      | boolean                     | YES         | false
 api_keys_registry             | monthly_budget_cents            | bigint                      | YES         | '-1'::integer
 api_keys_registry             | current_month_cents             | bigint                      | YES         | 0
 api_keys_registry             | last_used_at                    | timestamp with time zone    | YES         | 
 api_keys_registry             | expires_at                      | timestamp with time zone    | YES         | 
 api_keys_registry             | rate_limit_per_min              | integer                     | YES         | 
 api_keys_registry             | rate_limit_per_day              | integer                     | YES         | 
 api_keys_registry             | notes                           | text                        | YES         | 
 api_keys_registry             | created_at                      | timestamp with time zone    | YES         | now()
 api_keys_registry             | updated_at                      | timestamp with time zone    | YES         | now()
 api_keys_registry             | created_by                      | uuid                        | YES         | 
 audit_logs                    | id                              | uuid                        | NO          | gen_random_uuid()
 audit_logs                    | tenant_id                       | uuid                        | YES         | 
 audit_logs                    | user_id                         | uuid                        | YES         | 
 audit_logs                    | action                          | text                        | NO          | 
 audit_logs                    | entity_type                     | text                        | YES         | 
 audit_logs                    | entity_id                       | uuid                        | YES         | 
 audit_logs                    | details                         | jsonb                       | YES         | '{}'::jsonb
 audit_logs                    | ip_address                      | text                        | YES         | 
 audit_logs                    | user_agent                      | text                        | YES         | 
 audit_logs                    | created_at                      | timestamp with time zone    | NO          | now()
 audit_logs                    | impersonated_by                 | uuid                        | YES         | 
 audit_logs                    | resource_type                   | text                        | YES         | 
 audit_logs                    | resource_id                     | text                        | YES         | 
 audit_logs                    | old_data                        | jsonb                       | YES         | 
 audit_logs                    | new_data                        | jsonb                       | YES         | 
 audit_logs                    | metadata                        | jsonb                       | YES         | '{}'::jsonb
 automation_runs               | id                              | uuid                        | NO          | gen_random_uuid()
 automation_runs               | tenant_id                       | uuid                        | NO          | 
 automation_runs               | automation_id                   | uuid                        | NO          | 
 automation_runs               | status                          | text                        | NO          | 'pending'::text
 automation_runs               | trigger_event                   | text                        | YES         | 
 automation_runs               | trigger_data                    | jsonb                       | YES         | '{}'::jsonb
 automation_runs               | result                          | jsonb                       | YES         | '{}'::jsonb
 automation_runs               | error                           | text                        | YES         | 
 automation_runs               | started_at                      | timestamp with time zone    | NO          | now()
 automation_runs               | completed_at                    | timestamp with time zone    | YES         | 
 automation_workflows          | id                              | uuid                        | NO          | gen_random_uuid()
 automation_workflows          | tenant_id                       | uuid                        | NO          | 
 automation_workflows          | workflow_id                     | uuid                        | YES         | 
 automation_workflows          | name                            | text                        | NO          | 
 automation_workflows          | description                     | text                        | YES         | 
 automation_workflows          | enabled                         | boolean                     | YES         | true
 automation_workflows          | config                          | jsonb                       | YES         | '{}'::jsonb
 automation_workflows          | created_by                      | uuid                        | YES         | 
 automation_workflows          | created_at                      | timestamp with time zone    | NO          | now()
 automation_workflows          | updated_at                      | timestamp with time zone    | NO          | now()
 automations                   | id                              | uuid                        | NO          | gen_random_uuid()
 automations                   | tenant_id                       | uuid                        | NO          | 
 automations                   | name                            | text                        | NO          | 
 automations                   | description                     | text                        | YES         | 
 automations                   | is_active                       | boolean                     | YES         | true
 automations                   | trigger_type                    | text                        | NO          | 'event'::text
 automations                   | trigger_config                  | jsonb                       | YES         | '{}'::jsonb
 automations                   | actions                         | jsonb                       | NO          | '[]'::jsonb
 automations                   | conditions                      | jsonb                       | YES         | '{}'::jsonb
 automations                   | run_count                       | integer                     | YES         | 0
 automations                   | last_run_at                     | timestamp with time zone    | YES         | 
 automations                   | last_error                      | text                        | YES         | 
 automations                   | created_by                      | uuid                        | YES         | 
 automations                   | created_at                      | timestamp with time zone    | NO          | now()
 automations                   | updated_at                      | timestamp with time zone    | NO          | now()
 call_logs                     | id                              | uuid                        | NO          | gen_random_uuid()
 call_logs                     | tenant_id                       | uuid                        | NO          | 
 call_logs                     | contact_id                      | uuid                        | NO          | 
 call_logs                     | company_id                      | uuid                        | YES         | 
 call_logs                     | user_id                         | uuid                        | YES         | 
 call_logs                     | direction                       | text                        | NO          | 'outbound'::text
 call_logs                     | duration                        | integer                     | YES         | 0
 call_logs                     | notes                           | text                        | YES         | 
 call_logs                     | phone_number                    | text                        | YES         | 
 call_logs                     | recorded_url                    | text                        | YES         | 
 call_logs                     | assigned_to                     | uuid                        | YES         | 
 call_logs                     | created_at                      | timestamp with time zone    | NO          | now()
 call_notes                    | id                              | uuid                        | NO          | gen_random_uuid()
 call_notes                    | recording_id                    | uuid                        | YES         | 
 call_notes                    | tenant_id                       | uuid                        | NO          | 
 call_notes                    | contact_id                      | uuid                        | YES         | 
 call_notes                    | user_id                         | uuid                        | YES         | 
 call_notes                    | call_outcome                    | text                        | YES         | 
 call_notes                    | next_steps                      | text                        | YES         | 
 call_notes                    | notes                           | text                        | YES         | 
 call_notes                    | follow_up_date                  | timestamp with time zone    | YES         | 
 call_notes                    | created_at                      | timestamp with time zone    | NO          | now()
 call_recordings               | id                              | uuid                        | NO          | gen_random_uuid()
 call_recordings               | tenant_id                       | uuid                        | NO          | 
 call_recordings               | contact_id                      | uuid                        | YES         | 
 call_recordings               | deal_id                         | uuid                        | YES         | 
 call_recordings               | user_id                         | uuid                        | YES         | 
 call_recordings               | call_sid                        | text                        | YES         | 
 call_recordings               | direction                       | text                        | YES         | 
 call_recordings               | from_number                     | text                        | YES         | 
 call_recordings               | to_number                       | text                        | YES         | 
 call_recordings               | duration_seconds                | integer                     | YES         | 0
 call_recordings               | recording_url                   | text                        | YES         | 
 call_recordings               | recording_sid                   | text                        | YES         | 
 call_recordings               | transcription                   | text                        | YES         | 
 call_recordings               | transcription_status            | text                        | YES         | 'pending'::text
 call_recordings               | sentiment_score                 | numeric                     | YES         | 
 call_recordings               | sentiment_label                 | text                        | YES         | 
 call_recordings               | talk_listen_ratio               | numeric                     | YES         | 
 call_recordings               | keywords                        | ARRAY                       | YES         | 
 call_recordings               | topics                          | ARRAY                       | YES         | 
 call_recordings               | call_score                      | integer                     | YES         | 0
 call_recordings               | coaching_flags                  | ARRAY                       | YES         | 
 call_recordings               | metadata                        | jsonb                       | YES         | '{}'::jsonb
 call_recordings               | created_at                      | timestamp with time zone    | NO          | now()
 call_recordings               | updated_at                      | timestamp with time zone    | NO          | now()
 coaching_opportunities        | id                              | uuid                        | YES         | 
 coaching_opportunities        | contact_id                      | uuid                        | YES         | 
 coaching_opportunities        | first_name                      | text                        | YES         | 
 coaching_opportunities        | last_name                       | text                        | YES         | 
 coaching_opportunities        | user_id                         | uuid                        | YES         | 
 coaching_opportunities        | user_full_name                  | text                        | YES         | 
 coaching_opportunities        | call_score                      | integer                     | YES         | 
 coaching_opportunities        | sentiment_label                 | text                        | YES         | 
 coaching_opportunities        | duration_seconds                | integer                     | YES         | 
 coaching_opportunities        | coaching_flags                  | ARRAY                       | YES         | 
 coaching_opportunities        | created_at                      | timestamp with time zone    | YES         | 
 companies                     | id                              | uuid                        | NO          | gen_random_uuid()
 companies                     | tenant_id                       | uuid                        | NO          | 
 companies                     | name                            | text                        | NO          | 
 companies                     | industry                        | text                        | YES         | 
 companies                     | size                            | text                        | YES         | 
 companies                     | website                         | text                        | YES         | 
 companies                     | phone                           | text                        | YES         | 
 companies                     | address                         | text                        | YES         | 
 companies                     | notes                           | text                        | YES         | 
 companies                     | custom_fields                   | jsonb                       | YES         | '{}'::jsonb
 companies                     | created_by                      | uuid                        | YES         | 
 companies                     | created_at                      | timestamp with time zone    | NO          | now()
 companies                     | updated_at                      | timestamp with time zone    | NO          | now()
 companies                     | deleted_at                      | timestamp with time zone    | YES         | 
 companies                     | status                          | text                        | YES         | 'active'::text
 companies                     | assigned_to                     | uuid                        | YES         | 
 companies                     | deleted_by                      | uuid                        | YES         | 
 contact_emails                | id                              | uuid                        | NO          | gen_random_uuid()
 contact_emails                | contact_id                      | uuid                        | NO          | 
 contact_emails                | email                           | text                        | NO          | 
 contact_emails                | phone                           | text                        | YES         | 
 contact_emails                | is_primary                      | boolean                     | YES         | false
 contact_emails                | created_at                      | timestamp with time zone    | NO          | now()
 contact_merge_history         | id                              | uuid                        | NO          | gen_random_uuid()
 contact_merge_history         | tenant_id                       | uuid                        | NO          | 
 contact_merge_history         | primary_contact_id              | uuid                        | NO          | 
 contact_merge_history         | merged_contact_id               | uuid                        | NO          | 
 contact_merge_history         | merged_fields                   | jsonb                       | YES         | '{}'::jsonb
 contact_merge_history         | merged_by                       | uuid                        | YES         | 
 contact_merge_history         | merged_at                       | timestamp with time zone    | NO          | now()
 contact_merge_history         | reason                          | text                        | YES         | 
 contact_merge_history         | metadata                        | jsonb                       | YES         | '{}'::jsonb
 contact_scores                | id                              | uuid                        | NO          | gen_random_uuid()
 contact_scores                | contact_id                      | uuid                        | NO          | 
 contact_scores                | tenant_id                       | uuid                        | NO          | 
 contact_scores                | overall_score                   | integer                     | YES         | 0
 contact_scores                | engagement_score                | integer                     | YES         | 0
 contact_scores                | fit_score                       | integer                     | YES         | 0
 contact_scores                | intent_score                    | integer                     | YES         | 0
 contact_scores                | score_factors                   | jsonb                       | YES         | '[]'::jsonb
 contact_scores                | last_calculated_at              | timestamp with time zone    | YES         | now()
 contact_scores                | created_at                      | timestamp with time zone    | NO          | now()
 contact_tags                  | id                              | uuid                        | NO          | gen_random_uuid()
 contact_tags                  | contact_id                      | uuid                        | NO          | 
 contact_tags                  | tag_id                          | uuid                        | NO          | 
 contact_tags                  | created_at                      | timestamp with time zone    | NO          | now()
 contacts                      | id                              | uuid                        | NO          | gen_random_uuid()
 contacts                      | tenant_id                       | uuid                        | NO          | 
 contacts                      | first_name                      | text                        | NO          | ''::text
 contacts                      | last_name                       | text                        | NO          | ''::text
 contacts                      | email                           | text                        | YES         | 
 contacts                      | phone                           | text                        | YES         | 
 contacts                      | mobile                          | text                        | YES         | 
 contacts                      | title                           | text                        | YES         | 
 contacts                      | company_id                      | uuid                        | YES         | 
 contacts                      | assigned_to                     | uuid                        | YES         | 
 contacts                      | lead_status                     | text                        | YES         | 'new'::text
 contacts                      | lead_source                     | text                        | YES         | 
 contacts                      | lifecycle_stage                 | text                        | YES         | 'contact'::text
 contacts                      | notes                           | text                        | YES         | 
 contacts                      | tags                            | jsonb                       | YES         | '[]'::jsonb
 contacts                      | score                           | integer                     | YES         | 0
 contacts                      | city                            | text                        | YES         | 
 contacts                      | country                         | text                        | YES         | 
 contacts                      | website                         | text                        | YES         | 
 contacts                      | linkedin_url                    | text                        | YES         | 
 contacts                      | twitter_url                     | text                        | YES         | 
 contacts                      | custom_fields                   | jsonb                       | YES         | '{}'::jsonb
 contacts                      | is_archived                     | boolean                     | YES         | false
 contacts                      | created_by                      | uuid                        | YES         | 
 contacts                      | created_at                      | timestamp with time zone    | NO          | now()
 contacts                      | updated_at                      | timestamp with time zone    | NO          | now()
 contacts                      | deleted_at                      | timestamp with time zone    | YES         | 
 contacts                      | last_activity_at                | timestamp with time zone    | YES         | 
 contacts                      | search_vector                   | tsvector                    | YES         | 
 contacts                      | company_name                    | text                        | YES         | 
 contacts                      | do_not_contact                  | boolean                     | YES         | false
 contacts                      | metadata                        | jsonb                       | YES         | '{}'::jsonb
 conversation_keywords         | id                              | uuid                        | NO          | gen_random_uuid()
 conversation_keywords         | tenant_id                       | uuid                        | NO          | 
 conversation_keywords         | keyword                         | text                        | NO          | 
 conversation_keywords         | category                        | text                        | YES         | 
 conversation_keywords         | sentiment_impact                | numeric                     | YES         | 0
 conversation_keywords         | is_active                       | boolean                     | YES         | true
 conversation_keywords         | created_at                      | timestamp with time zone    | NO          | now()
 conversation_metrics          | id                              | uuid                        | NO          | gen_random_uuid()
 conversation_metrics          | tenant_id                       | uuid                        | NO          | 
 conversation_metrics          | user_id                         | uuid                        | YES         | 
 conversation_metrics          | period_start                    | date                        | NO          | 
 conversation_metrics          | period_end                      | date                        | NO          | 
 conversation_metrics          | total_calls                     | integer                     | YES         | 0
 conversation_metrics          | total_duration_seconds          | integer                     | YES         | 0
 conversation_metrics          | avg_call_duration_seconds       | numeric                     | YES         | 0
 conversation_metrics          | positive_calls                  | integer                     | YES         | 0
 conversation_metrics          | neutral_calls                   | integer                     | YES         | 0
 conversation_metrics          | negative_calls                  | integer                     | YES         | 0
 conversation_metrics          | avg_call_score                  | numeric                     | YES         | 0
 conversation_metrics          | avg_talk_listen_ratio           | numeric                     | YES         | 0
 conversation_metrics          | connected_calls                 | integer                     | YES         | 0
 conversation_metrics          | voicemail_calls                 | integer                     | YES         | 0
 conversation_metrics          | no_answer_calls                 | integer                     | YES         | 0
 conversation_metrics          | metadata                        | jsonb                       | YES         | '{}'::jsonb
 conversation_metrics          | created_at                      | timestamp with time zone    | NO          | now()
 cost_anomalies                | id                              | uuid                        | NO          | gen_random_uuid()
 cost_anomalies                | tenant_id                       | uuid                        | NO          | 
 cost_anomalies                | service                         | text                        | NO          | 
 cost_anomalies                | expected_daily_cents            | bigint                      | YES         | 
 cost_anomalies                | actual_daily_cents              | bigint                      | YES         | 
 cost_anomalies                | deviation_pct                   | numeric                     | YES         | 
 cost_anomalies                | suspected_cause                 | text                        | YES         | 
 cost_anomalies                | action_taken                    | text                        | YES         | 
 cost_anomalies                | reviewed                        | boolean                     | YES         | false
 cost_anomalies                | reviewed_by                     | uuid                        | YES         | 
 cost_anomalies                | created_at                      | timestamp with time zone    | YES         | now()
 custom_fields                 | id                              | uuid                        | NO          | gen_random_uuid()
 custom_fields                 | tenant_id                       | uuid                        | NO          | 
 custom_fields                 | entity_type                     | text                        | NO          | 
 custom_fields                 | name                            | text                        | NO          | 
 custom_fields                 | field_type                      | text                        | NO          | 'text'::text
 custom_fields                 | options                         | jsonb                       | YES         | '[]'::jsonb
 custom_fields                 | required                        | boolean                     | YES         | false
 custom_fields                 | sort_order                      | integer                     | YES         | 0
 custom_fields                 | created_at                      | timestamp with time zone    | NO          | now()
 dashboards                    | id                              | uuid                        | NO          | gen_random_uuid()
 dashboards                    | tenant_id                       | uuid                        | YES         | 
 dashboards                    | name                            | text                        | NO          | 
 dashboards                    | description                     | text                        | YES         | 
 dashboards                    | layout                          | jsonb                       | YES         | '{}'::jsonb
 dashboards                    | widgets                         | jsonb                       | YES         | '[]'::jsonb
 dashboards                    | is_default                      | boolean                     | YES         | false
 dashboards                    | created_by                      | uuid                        | YES         | 
 dashboards                    | created_at                      | timestamp with time zone    | NO          | now()
 dashboards                    | updated_at                      | timestamp with time zone    | NO          | now()
 deal_stages                   | id                              | uuid                        | NO          | gen_random_uuid()
 deal_stages                   | tenant_id                       | uuid                        | NO          | 
 deal_stages                   | name                            | text                        | NO          | 
 deal_stages                   | stage_order                     | integer                     | NO          | 0
 deal_stages                   | probability                     | integer                     | NO          | 10
 deal_stages                   | color                           | text                        | YES         | '#6b7280'::text
 deals                         | id                              | uuid                        | NO          | gen_random_uuid()
 deals                         | tenant_id                       | uuid                        | NO          | 
 deals                         | title                           | text                        | NO          | 
 deals                         | value                           | numeric                     | YES         | 0
 deals                         | stage                           | text                        | YES         | 'lead'::text
 deals                         | stage_id                        | uuid                        | YES         | 
 deals                         | probability                     | integer                     | YES         | 10
 deals                         | close_date                      | date                        | YES         | 
 deals                         | contact_id                      | uuid                        | YES         | 
 deals                         | company_id                      | uuid                        | YES         | 
 deals                         | assigned_to                     | uuid                        | YES         | 
 deals                         | notes                           | text                        | YES         | 
 deals                         | custom_fields                   | jsonb                       | YES         | '{}'::jsonb
 deals                         | created_by                      | uuid                        | YES         | 
 deals                         | created_at                      | timestamp with time zone    | NO          | now()
 deals                         | updated_at                      | timestamp with time zone    | NO          | now()
 deals                         | deleted_at                      | timestamp with time zone    | YES         | 
 deals                         | contact_name                    | text                        | YES         | 
 deals                         | name                            | text                        | YES         | 
 deals                         | owner_id                        | uuid                        | YES         | 
 deals                         | description                     | text                        | YES         | 
 deals                         | deleted_by                      | uuid                        | YES         | 
 deals                         | won_at                          | timestamp with time zone    | YES         | 
 deals                         | pipeline_id                     | uuid                        | YES         | 
 email_templates               | id                              | uuid                        | NO          | gen_random_uuid()
 email_templates               | tenant_id                       | uuid                        | NO          | 
 email_templates               | name                            | text                        | NO          | 
 email_templates               | subject                         | text                        | NO          | 
 email_templates               | body                            | text                        | NO          | 
 email_templates               | variables                       | ARRAY                       | YES         | '{}'::text[]
 email_templates               | is_global                       | boolean                     | YES         | false
 email_templates               | created_by                      | uuid                        | YES         | 
 email_templates               | created_at                      | timestamp with time zone    | NO          | now()
 email_templates               | updated_at                      | timestamp with time zone    | NO          | now()
 email_tracking                | id                              | uuid                        | NO          | 
 email_tracking                | tenant_id                       | uuid                        | NO          | 
 email_tracking                | contact_id                      | uuid                        | YES         | 
 email_tracking                | recipient                       | text                        | NO          | 
 email_tracking                | subject                         | text                        | YES         | 
 email_tracking                | sequence_enrollment_id          | uuid                        | YES         | 
 email_tracking                | opened_at                       | timestamp with time zone    | YES         | 
 email_tracking                | clicked_at                      | timestamp with time zone    | YES         | 
 email_tracking                | created_at                      | timestamp with time zone    | NO          | now()
 email_verifications           | id                              | uuid                        | NO          | gen_random_uuid()
 email_verifications           | user_id                         | uuid                        | NO          | 
 email_verifications           | token_hash                      | text                        | NO          | 
 email_verifications           | expires_at                      | timestamp with time zone    | NO          | 
 email_verifications           | used_at                         | timestamp with time zone    | YES         | 
 email_verifications           | created_at                      | timestamp with time zone    | NO          | now()
 error_logs                    | id                              | uuid                        | NO          | gen_random_uuid()
 error_logs                    | tenant_id                       | uuid                        | YES         | 
 error_logs                    | user_id                         | uuid                        | YES         | 
 error_logs                    | level                           | text                        | NO          | 'error'::text
 error_logs                    | code                            | text                        | YES         | 
 error_logs                    | message                         | text                        | NO          | 
 error_logs                    | stack                           | text                        | YES         | 
 error_logs                    | context                         | jsonb                       | YES         | '{}'::jsonb
 error_logs                    | resolved                        | boolean                     | YES         | false
 error_logs                    | resolved_at                     | timestamp with time zone    | YES         | 
 error_logs                    | resolved_by                     | uuid                        | YES         | 
 error_logs                    | created_at                      | timestamp with time zone    | NO          | now()
 failed_webhooks               | id                              | uuid                        | NO          | gen_random_uuid()
 failed_webhooks               | webhook_id                      | uuid                        | NO          | 
 failed_webhooks               | tenant_id                       | uuid                        | NO          | 
 failed_webhooks               | url                             | text                        | NO          | 
 failed_webhooks               | payload                         | jsonb                       | NO          | 
 failed_webhooks               | error_message                   | text                        | NO          | 
 failed_webhooks               | attempt_count                   | integer                     | NO          | 0
 failed_webhooks               | created_at                      | timestamp with time zone    | NO          | now()
 forms                         | id                              | uuid                        | NO          | gen_random_uuid()
 forms                         | tenant_id                       | uuid                        | NO          | 
 forms                         | name                            | text                        | NO          | 
 forms                         | description                     | text                        | YES         | 
 forms                         | fields                          | jsonb                       | NO          | '[]'::jsonb
 forms                         | settings                        | jsonb                       | YES         | '{}'::jsonb
 forms                         | is_active                       | boolean                     | YES         | true
 forms                         | submissions_count               | integer                     | YES         | 0
 forms                         | created_by                      | uuid                        | YES         | 
 forms                         | created_at                      | timestamp with time zone    | NO          | now()
 forms                         | updated_at                      | timestamp with time zone    | NO          | now()
 forms                         | deleted_at                      | timestamp with time zone    | YES         | 
 health_checks                 | id                              | uuid                        | NO          | gen_random_uuid()
 health_checks                 | service                         | text                        | NO          | 
 health_checks                 | status                          | text                        | NO          | 'ok'::text
 health_checks                 | latency_ms                      | integer                     | YES         | 
 health_checks                 | message                         | text                        | YES         | 
 health_checks                 | checked_at                      | timestamp with time zone    | NO          | now()
 high_priority_insights        | id                              | uuid                        | YES         | 
 high_priority_insights        | tenant_id                       | uuid                        | YES         | 
 high_priority_insights        | entity_type                     | text                        | YES         | 
 high_priority_insights        | entity_id                       | uuid                        | YES         | 
 high_priority_insights        | insight_type                    | text                        | YES         | 
 high_priority_insights        | title                           | text                        | YES         | 
 high_priority_insights        | description                     | text                        | YES         | 
 high_priority_insights        | confidence_score                | numeric                     | YES         | 
 high_priority_insights        | priority                        | text                        | YES         | 
 high_priority_insights        | metadata                        | jsonb                       | YES         | 
 high_priority_insights        | is_read                         | boolean                     | YES         | 
 high_priority_insights        | is_actioned                     | boolean                     | YES         | 
 high_priority_insights        | created_at                      | timestamp with time zone    | YES         | 
 high_priority_insights        | expires_at                      | timestamp with time zone    | YES         | 
 high_priority_insights        | first_name                      | text                        | YES         | 
 high_priority_insights        | last_name                       | text                        | YES         | 
 high_priority_insights        | email                           | text                        | YES         | 
 high_priority_insights        | lead_status                     | text                        | YES         | 
 impersonation_history         | id                              | uuid                        | YES         | 
 impersonation_history         | super_admin_id                  | uuid                        | YES         | 
 impersonation_history         | super_admin_email               | text                        | YES         | 
 impersonation_history         | super_admin_name                | text                        | YES         | 
 impersonation_history         | impersonated_user_id            | uuid                        | YES         | 
 impersonation_history         | impersonated_email              | text                        | YES         | 
 impersonation_history         | impersonated_name               | text                        | YES         | 
 impersonation_history         | tenant_id                       | uuid                        | YES         | 
 impersonation_history         | tenant_name                     | text                        | YES         | 
 impersonation_history         | started_at                      | timestamp with time zone    | YES         | 
 impersonation_history         | ended_at                        | timestamp with time zone    | YES         | 
 impersonation_history         | duration_minutes                | numeric                     | YES         | 
 impersonation_history         | ip_address                      | inet                        | YES         | 
 impersonation_history         | reason                          | text                        | YES         | 
 impersonation_history         | action_count                    | integer                     | YES         | 
 impersonation_sessions        | id                              | uuid                        | NO          | gen_random_uuid()
 impersonation_sessions        | super_admin_id                  | uuid                        | YES         | 
 impersonation_sessions        | impersonated_user_id            | uuid                        | YES         | 
 impersonation_sessions        | tenant_id                       | uuid                        | YES         | 
 impersonation_sessions        | started_at                      | timestamp with time zone    | NO          | now()
 impersonation_sessions        | ended_at                        | timestamp with time zone    | YES         | 
 impersonation_sessions        | ip_address                      | inet                        | YES         | 
 impersonation_sessions        | user_agent                      | text                        | YES         | 
 impersonation_sessions        | actions                         | jsonb                       | YES         | '[]'::jsonb
 impersonation_sessions        | reason                          | text                        | YES         | 
 impersonation_sessions        | created_at                      | timestamp with time zone    | NO          | now()
 integrations                  | id                              | uuid                        | NO          | gen_random_uuid()
 integrations                  | tenant_id                       | uuid                        | NO          | 
 integrations                  | user_id                         | uuid                        | NO          | 
 integrations                  | type                            | text                        | NO          | 
 integrations                  | name                            | text                        | NO          | 
 integrations                  | config                          | jsonb                       | YES         | '{}'::jsonb
 integrations                  | is_active                       | boolean                     | YES         | true
 integrations                  | last_used_at                    | timestamp with time zone    | YES         | 
 integrations                  | created_at                      | timestamp with time zone    | NO          | now()
 integrations                  | updated_at                      | timestamp with time zone    | NO          | now()
 invitations                   | id                              | uuid                        | NO          | gen_random_uuid()
 invitations                   | tenant_id                       | uuid                        | NO          | 
 invitations                   | email                           | text                        | NO          | 
 invitations                   | role_slug                       | text                        | NO          | 'viewer'::text
 invitations                   | token                           | text                        | NO          | 
 invitations                   | expires_at                      | timestamp with time zone    | NO          | 
 invitations                   | accepted_at                     | timestamp with time zone    | YES         | 
 invitations                   | invited_by                      | uuid                        | YES         | 
 invitations                   | created_at                      | timestamp with time zone    | NO          | now()
 lead_activities               | id                              | uuid                        | NO          | gen_random_uuid()
 lead_activities               | tenant_id                       | uuid                        | NO          | 
 lead_activities               | lead_id                         | uuid                        | NO          | 
 lead_activities               | user_id                         | uuid                        | YES         | 
 lead_activities               | activity_type                   | text                        | NO          | 
 lead_activities               | description                     | text                        | YES         | 
 lead_activities               | metadata                        | jsonb                       | YES         | '{}'::jsonb
 lead_activities               | created_at                      | timestamp with time zone    | NO          | now()
 lead_tags                     | id                              | uuid                        | NO          | gen_random_uuid()
 lead_tags                     | lead_id                         | uuid                        | NO          | 
 lead_tags                     | tag_id                          | uuid                        | NO          | 
 lead_tags                     | created_at                      | timestamp with time zone    | NO          | now()
 leads                         | id                              | uuid                        | NO          | gen_random_uuid()
 leads                         | tenant_id                       | uuid                        | NO          | 
 leads                         | first_name                      | text                        | NO          | ''::text
 leads                         | last_name                       | text                        | YES         | 
 leads                         | email                           | text                        | YES         | 
 leads                         | phone                           | text                        | YES         | 
 leads                         | mobile                          | text                        | YES         | 
 leads                         | title                           | text                        | YES         | 
 leads                         | company_name                    | text                        | YES         | 
 leads                         | lead_source                     | text                        | YES         | 'api'::text
 leads                         | lead_status                     | text                        | YES         | 'new'::text
 leads                         | lifecycle_stage                 | text                        | YES         | 'lead'::text
 leads                         | assigned_to                     | uuid                        | YES         | 
 leads                         | owner_id                        | uuid                        | YES         | 
 leads                         | created_by                      | uuid                        | YES         | 
 leads                         | tags                            | jsonb                       | YES         | '[]'::jsonb
 leads                         | notes                           | text                        | YES         | 
 leads                         | custom_fields                   | jsonb                       | YES         | '{}'::jsonb
 leads                         | created_at                      | timestamp with time zone    | NO          | now()
 leads                         | updated_at                      | timestamp with time zone    | NO          | now()
 leads                         | deleted_at                      | timestamp with time zone    | YES         | 
 leads                         | score                           | integer                     | YES         | 0
 leads                         | department                      | text                        | YES         | 
 leads                         | company_size                    | text                        | YES         | 
 leads                         | company_industry                | text                        | YES         | 
 leads                         | company_website                 | text                        | YES         | 
 leads                         | company_annual_revenue          | numeric                     | YES         | 
 leads                         | lead_status_changed_at          | timestamp with time zone    | YES         | now()
 leads                         | score_previous                  | integer                     | YES         | 0
 leads                         | budget                          | numeric                     | YES         | 
 leads                         | budget_currency                 | text                        | YES         | 'USD'::text
 leads                         | authority_level                 | text                        | YES         | 'unknown'::text
 leads                         | need_description                | text                        | YES         | 
 leads                         | timeline                        | text                        | YES         | 
 leads                         | timeline_target_date            | date                        | YES         | 
 leads                         | country                         | text                        | YES         | 
 leads                         | state                           | text                        | YES         | 
 leads                         | city                            | text                        | YES         | 
 leads                         | address_line1                   | text                        | YES         | 
 leads                         | postal_code                     | text                        | YES         | 
 leads                         | linkedin_url                    | text                        | YES         | 
 leads                         | twitter_handle                  | text                        | YES         | 
 leads                         | website                         | text                        | YES         | 
 leads                         | utm_source                      | text                        | YES         | 
 leads                         | utm_medium                      | text                        | YES         | 
 leads                         | utm_campaign                    | text                        | YES         | 
 leads                         | internal_notes                  | text                        | YES         | 
 leads                         | full_name                       | text                        | YES         | 
 leads                         | search_vector                   | tsvector                    | YES         | 
 leads                         | metadata                        | jsonb                       | YES         | '{}'::jsonb
 leads                         | do_not_contact                  | boolean                     | YES         | false
 leads                         | last_activity_at                | timestamp with time zone    | YES         | 
 meetings                      | id                              | uuid                        | NO          | gen_random_uuid()
 meetings                      | tenant_id                       | uuid                        | NO          | 
 meetings                      | title                           | text                        | NO          | 
 meetings                      | description                     | text                        | YES         | 
 meetings                      | contact_id                      | uuid                        | YES         | 
 meetings                      | deal_id                         | uuid                        | YES         | 
 meetings                      | host_id                         | uuid                        | NO          | 
 meetings                      | attendee_emails                 | jsonb                       | YES         | '[]'::jsonb
 meetings                      | start_time                      | timestamp with time zone    | NO          | 
 meetings                      | end_time                        | timestamp with time zone    | NO          | 
 meetings                      | status                          | text                        | NO          | 'scheduled'::text
 meetings                      | meeting_url                     | text                        | YES         | 
 meetings                      | meeting_provider                | text                        | YES         | 'zoom'::text
 meetings                      | meeting_id                      | text                        | YES         | 
 meetings                      | notes                           | text                        | YES         | 
 meetings                      | created_by                      | uuid                        | YES         | 
 meetings                      | created_at                      | timestamp with time zone    | NO          | now()
 meetings                      | updated_at                      | timestamp with time zone    | NO          | now()
 meetings                      | deleted_at                      | timestamp with time zone    | YES         | 
 merge_history_summary         | id                              | uuid                        | YES         | 
 merge_history_summary         | tenant_id                       | uuid                        | YES         | 
 merge_history_summary         | primary_contact_id              | uuid                        | YES         | 
 merge_history_summary         | primary_first_name              | text                        | YES         | 
 merge_history_summary         | primary_last_name               | text                        | YES         | 
 merge_history_summary         | primary_email                   | text                        | YES         | 
 merge_history_summary         | merged_contact_id               | uuid                        | YES         | 
 merge_history_summary         | merged_first_name               | text                        | YES         | 
 merge_history_summary         | merged_last_name                | text                        | YES         | 
 merge_history_summary         | merged_email                    | text                        | YES         | 
 merge_history_summary         | merged_fields                   | jsonb                       | YES         | 
 merge_history_summary         | merged_by                       | uuid                        | YES         | 
 merge_history_summary         | merged_by_name                  | text                        | YES         | 
 merge_history_summary         | reason                          | text                        | YES         | 
 merge_history_summary         | merged_at                       | timestamp with time zone    | YES         | 
 migration_history             | id                              | uuid                        | NO          | gen_random_uuid()
 migration_history             | filename                        | character varying           | NO          | 
 migration_history             | applied_at                      | timestamp without time zone | NO          | now()
 notifications                 | id                              | uuid                        | NO          | gen_random_uuid()
 notifications                 | user_id                         | uuid                        | NO          | 
 notifications                 | tenant_id                       | uuid                        | NO          | 
 notifications                 | type                            | text                        | NO          | 
 notifications                 | title                           | text                        | NO          | 
 notifications                 | body                            | text                        | YES         | 
 notifications                 | link                            | text                        | YES         | 
 notifications                 | metadata                        | jsonb                       | YES         | '{}'::jsonb
 notifications                 | is_read                         | boolean                     | YES         | false
 notifications                 | created_at                      | timestamp with time zone    | NO          | now()
 onboarding_progress           | id                              | uuid                        | NO          | gen_random_uuid()
 onboarding_progress           | tenant_id                       | uuid                        | NO          | 
 onboarding_progress           | steps_done                      | jsonb                       | YES         | '{}'::jsonb
 onboarding_progress           | completed_at                    | timestamp with time zone    | YES         | 
 onboarding_progress           | created_at                      | timestamp with time zone    | NO          | now()
 password_resets               | id                              | uuid                        | NO          | gen_random_uuid()
 password_resets               | user_id                         | uuid                        | NO          | 
 password_resets               | token_hash                      | text                        | NO          | 
 password_resets               | expires_at                      | timestamp with time zone    | NO          | 
 password_resets               | used_at                         | timestamp with time zone    | YES         | 
 password_resets               | created_at                      | timestamp with time zone    | NO          | now()
 pending_sequence_steps        | log_id                          | uuid                        | YES         | 
 pending_sequence_steps        | enrollment_id                   | uuid                        | YES         | 
 pending_sequence_steps        | step_id                         | uuid                        | YES         | 
 pending_sequence_steps        | step_number                     | integer                     | YES         | 
 pending_sequence_steps        | scheduled_at                    | timestamp with time zone    | YES         | 
 pending_sequence_steps        | sequence_id                     | uuid                        | YES         | 
 pending_sequence_steps        | contact_id                      | uuid                        | YES         | 
 pending_sequence_steps        | tenant_id                       | uuid                        | YES         | 
 pending_sequence_steps        | step_type                       | text                        | YES         | 
 pending_sequence_steps        | subject                         | text                        | YES         | 
 pending_sequence_steps        | body                            | text                        | YES         | 
 pending_sequence_steps        | task_title                      | text                        | YES         | 
 pending_sequence_steps        | task_description                | text                        | YES         | 
 pending_sequence_steps        | contact_email                   | text                        | YES         | 
 pending_sequence_steps        | first_name                      | text                        | YES         | 
 pending_sequence_steps        | last_name                       | text                        | YES         | 
 pending_sequence_steps        | company_name                    | text                        | YES         | 
 pipeline_stages               | id                              | uuid                        | NO          | gen_random_uuid()
 pipeline_stages               | tenant_id                       | uuid                        | NO          | 
 pipeline_stages               | name                            | text                        | NO          | 
 pipeline_stages               | stage_order                     | integer                     | NO          | 0
 pipeline_stages               | probability                     | integer                     | NO          | 10
 pipeline_stages               | color                           | text                        | YES         | '#6b7280'::text
 pipelines                     | id                              | uuid                        | NO          | gen_random_uuid()
 pipelines                     | tenant_id                       | uuid                        | NO          | 
 pipelines                     | name                            | text                        | NO          | 
 pipelines                     | stages                          | jsonb                       | YES         | '[]'::jsonb
 pipelines                     | is_default                      | boolean                     | YES         | false
 pipelines                     | created_at                      | timestamp with time zone    | NO          | now()
 pipelines                     | updated_at                      | timestamp with time zone    | NO          | now()
 plans                         | id                              | uuid                        | NO          | gen_random_uuid()
 plans                         | name                            | text                        | NO          | 
 plans                         | slug                            | text                        | NO          | 
 plans                         | price_cents                     | integer                     | NO          | 0
 plans                         | max_users                       | integer                     | YES         | 
 plans                         | max_contacts                    | integer                     | YES         | 
 plans                         | max_storage_mb                  | integer                     | YES         | 
 plans                         | features                        | jsonb                       | YES         | '[]'::jsonb
 plans                         | created_at                      | timestamp with time zone    | NO          | now()
 plans                         | max_deals                       | integer                     | YES         | 0
 plans                         | max_automations                 | integer                     | YES         | 0
 plans                         | price_monthly                   | integer                     | YES         | 0
 plans                         | price_yearly                    | integer                     | YES         | 0
 plans                         | is_active                       | boolean                     | YES         | true
 plans                         | sort_order                      | integer                     | YES         | 0
 plans                         | max_forms                       | integer                     | YES         | 3
 plans                         | max_api_calls_day               | integer                     | YES         | 1000
 plans                         | max_storage_gb                  | integer                     | YES         | 
 plans                         | price                           | integer                     | YES         | 0
 plans                         | description                     | text                        | YES         | 
 potential_duplicates          | contact_1_id                    | uuid                        | YES         | 
 potential_duplicates          | contact_1_first_name            | text                        | YES         | 
 potential_duplicates          | contact_1_last_name             | text                        | YES         | 
 potential_duplicates          | contact_1_email                 | text                        | YES         | 
 potential_duplicates          | contact_1_phone                 | text                        | YES         | 
 potential_duplicates          | contact_2_id                    | uuid                        | YES         | 
 potential_duplicates          | contact_2_first_name            | text                        | YES         | 
 potential_duplicates          | contact_2_last_name             | text                        | YES         | 
 potential_duplicates          | contact_2_email                 | text                        | YES         | 
 potential_duplicates          | contact_2_phone                 | text                        | YES         | 
 potential_duplicates          | match_type                      | text                        | YES         | 
 potential_duplicates          | tenant_id                       | uuid                        | YES         | 
 recent_calls_with_analysis    | id                              | uuid                        | YES         | 
 recent_calls_with_analysis    | contact_id                      | uuid                        | YES         | 
 recent_calls_with_analysis    | first_name                      | text                        | YES         | 
 recent_calls_with_analysis    | last_name                       | text                        | YES         | 
 recent_calls_with_analysis    | user_id                         | uuid                        | YES         | 
 recent_calls_with_analysis    | user_full_name                  | text                        | YES         | 
 recent_calls_with_analysis    | direction                       | text                        | YES         | 
 recent_calls_with_analysis    | duration_seconds                | integer                     | YES         | 
 recent_calls_with_analysis    | sentiment_label                 | text                        | YES         | 
 recent_calls_with_analysis    | sentiment_score                 | numeric                     | YES         | 
 recent_calls_with_analysis    | call_score                      | integer                     | YES         | 
 recent_calls_with_analysis    | talk_listen_ratio               | numeric                     | YES         | 
 recent_calls_with_analysis    | keywords                        | ARRAY                       | YES         | 
 recent_calls_with_analysis    | transcription                   | text                        | YES         | 
 recent_calls_with_analysis    | created_at                      | timestamp with time zone    | YES         | 
 recent_workflow_executions    | id                              | uuid                        | YES         | 
 recent_workflow_executions    | workflow_id                     | uuid                        | YES         | 
 recent_workflow_executions    | workflow_name                   | text                        | YES         | 
 recent_workflow_executions    | trigger_entity_type             | text                        | YES         | 
 recent_workflow_executions    | trigger_entity_id               | uuid                        | YES         | 
 recent_workflow_executions    | status                          | text                        | YES         | 
 recent_workflow_executions    | started_at                      | timestamp with time zone    | YES         | 
 recent_workflow_executions    | completed_at                    | timestamp with time zone    | YES         | 
 recent_workflow_executions    | error_message                   | text                        | YES         | 
 recent_workflow_executions    | actions_executed_count          | integer                     | YES         | 
 recent_workflow_executions    | duration_ms                     | numeric                     | YES         | 
 refresh_tokens                | id                              | uuid                        | NO          | gen_random_uuid()
 refresh_tokens                | user_id                         | uuid                        | NO          | 
 refresh_tokens                | token_hash                      | text                        | NO          | 
 refresh_tokens                | expires_at                      | timestamp with time zone    | NO          | 
 refresh_tokens                | created_at                      | timestamp with time zone    | NO          | now()
 report_executions             | id                              | uuid                        | NO          | gen_random_uuid()
 report_executions             | report_id                       | uuid                        | YES         | 
 report_executions             | tenant_id                       | uuid                        | NO          | 
 report_executions             | executed_by                     | uuid                        | YES         | 
 report_executions             | executed_at                     | timestamp with time zone    | NO          | now()
 report_executions             | execution_type                  | text                        | YES         | 
 report_executions             | filters_applied                 | jsonb                       | YES         | '{}'::jsonb
 report_executions             | results_summary                 | jsonb                       | YES         | '{}'::jsonb
 report_executions             | export_format                   | text                        | YES         | 
 report_executions             | export_url                      | text                        | YES         | 
 report_executions             | export_expires_at               | timestamp with time zone    | YES         | 
 report_executions             | duration_ms                     | integer                     | YES         | 0
 report_executions             | status                          | text                        | YES         | 'success'::text
 report_templates              | id                              | uuid                        | NO          | gen_random_uuid()
 report_templates              | name                            | text                        | NO          | 
 report_templates              | description                     | text                        | YES         | 
 report_templates              | category                        | text                        | YES         | 
 report_templates              | report_type                     | text                        | NO          | 
 report_templates              | config                          | jsonb                       | NO          | 
 report_templates              | filters                         | jsonb                       | YES         | '{}'::jsonb
 report_templates              | is_global                       | boolean                     | YES         | true
 report_templates              | usage_count                     | integer                     | YES         | 0
 report_templates              | created_at                      | timestamp with time zone    | NO          | now()
 report_usage_stats            | id                              | uuid                        | YES         | 
 report_usage_stats            | name                            | text                        | YES         | 
 report_usage_stats            | report_type                     | text                        | YES         | 
 report_usage_stats            | is_public                       | boolean                     | YES         | 
 report_usage_stats            | is_scheduled                    | boolean                     | YES         | 
 report_usage_stats            | last_run_at                     | timestamp with time zone    | YES         | 
 report_usage_stats            | created_by_name                 | text                        | YES         | 
 report_usage_stats            | total_executions                | bigint                      | YES         | 
 report_usage_stats            | executions_7d                   | bigint                      | YES         | 
 report_usage_stats            | executions_30d                  | bigint                      | YES         | 
 report_usage_stats            | last_execution_at               | timestamp with time zone    | YES         | 
 report_usage_stats            | avg_duration_ms                 | numeric                     | YES         | 
 restore_snapshots             | id                              | uuid                        | NO          | gen_random_uuid()
 restore_snapshots             | tenant_id                       | uuid                        | NO          | 
 restore_snapshots             | restore_log_id                  | uuid                        | YES         | 
 restore_snapshots             | snapshot_data                   | jsonb                       | NO          | 
 restore_snapshots             | table_count                     | integer                     | YES         | 0
 restore_snapshots             | record_count                    | bigint                      | YES         | 0
 restore_snapshots             | created_by                      | uuid                        | YES         | 
 restore_snapshots             | created_at                      | timestamp without time zone | NO          | now()
 restore_snapshots             | expires_at                      | timestamp without time zone | NO          | (now() + '7 days'::interval)
 roles                         | id                              | uuid                        | NO          | gen_random_uuid()
 roles                         | tenant_id                       | uuid                        | YES         | 
 roles                         | name                            | text                        | NO          | 
 roles                         | slug                            | text                        | NO          | 
 roles                         | description                     | text                        | YES         | 
 roles                         | permissions                     | jsonb                       | YES         | '{}'::jsonb
 roles                         | created_at                      | timestamp with time zone    | NO          | now()
 saved_reports                 | id                              | uuid                        | NO          | gen_random_uuid()
 saved_reports                 | tenant_id                       | uuid                        | NO          | 
 saved_reports                 | name                            | text                        | NO          | 
 saved_reports                 | description                     | text                        | YES         | 
 saved_reports                 | report_type                     | text                        | NO          | 
 saved_reports                 | config                          | jsonb                       | NO          | 
 saved_reports                 | filters                         | jsonb                       | YES         | '{}'::jsonb
 saved_reports                 | is_public                       | boolean                     | YES         | false
 saved_reports                 | is_scheduled                    | boolean                     | YES         | false
 saved_reports                 | schedule_config                 | jsonb                       | YES         | '{}'::jsonb
 saved_reports                 | last_run_at                     | timestamp with time zone    | YES         | 
 saved_reports                 | created_by                      | uuid                        | YES         | 
 saved_reports                 | created_at                      | timestamp with time zone    | NO          | now()
 saved_reports                 | updated_at                      | timestamp with time zone    | NO          | now()
 scheduled_reports_due         | id                              | uuid                        | YES         | 
 scheduled_reports_due         | name                            | text                        | YES         | 
 scheduled_reports_due         | report_type                     | text                        | YES         | 
 scheduled_reports_due         | schedule_config                 | jsonb                       | YES         | 
 scheduled_reports_due         | last_run_at                     | timestamp with time zone    | YES         | 
 scheduled_reports_due         | created_by                      | uuid                        | YES         | 
 scheduled_reports_due         | created_by_email                | text                        | YES         | 
 scheduled_reports_due         | created_by_name                 | text                        | YES         | 
 selective_restore_audit_log   | id                              | uuid                        | NO          | gen_random_uuid()
 selective_restore_audit_log   | restore_log_id                  | uuid                        | YES         | 
 selective_restore_audit_log   | tenant_id                       | uuid                        | NO          | 
 selective_restore_audit_log   | action                          | character varying           | NO          | 
 selective_restore_audit_log   | performed_by                    | uuid                        | YES         | 
 selective_restore_audit_log   | performed_by_email              | character varying           | YES         | 
 selective_restore_audit_log   | details                         | jsonb                       | YES         | 
 selective_restore_audit_log   | ip_address                      | character varying           | YES         | 
 selective_restore_audit_log   | user_agent                      | text                        | YES         | 
 selective_restore_audit_log   | created_at                      | timestamp without time zone | NO          | now()
 selective_restore_logs        | id                              | uuid                        | NO          | gen_random_uuid()
 selective_restore_logs        | backup_id                       | uuid                        | NO          | 
 selective_restore_logs        | target_tenant_id                | uuid                        | NO          | 
 selective_restore_logs        | status                          | character varying           | YES         | 'pending'::character varying
 selective_restore_logs        | restore_mode                    | character varying           | NO          | 
 selective_restore_logs        | tables_selected                 | jsonb                       | NO          | 
 selective_restore_logs        | pre_restore_snapshot_id         | uuid                        | YES         | 
 selective_restore_logs        | records_affected                | jsonb                       | YES         | 
 selective_restore_logs        | records_per_table               | jsonb                       | YES         | 
 selective_restore_logs        | started_at                      | timestamp without time zone | YES         | 
 selective_restore_logs        | completed_at                    | timestamp without time zone | YES         | 
 selective_restore_logs        | duration_ms                     | integer                     | YES         | 
 selective_restore_logs        | performed_by                    | uuid                        | YES         | 
 selective_restore_logs        | error_message                   | text                        | YES         | 
 selective_restore_logs        | rollback_reason                 | text                        | YES         | 
 selective_restore_logs        | notes                           | text                        | YES         | 
 selective_restore_logs        | created_at                      | timestamp without time zone | NO          | now()
 sequence_enrollments          | id                              | uuid                        | NO          | gen_random_uuid()
 sequence_enrollments          | sequence_id                     | uuid                        | NO          | 
 sequence_enrollments          | contact_id                      | uuid                        | NO          | 
 sequence_enrollments          | tenant_id                       | uuid                        | NO          | 
 sequence_enrollments          | status                          | text                        | YES         | 'active'::text
 sequence_enrollments          | current_step                    | integer                     | YES         | 1
 sequence_enrollments          | enrolled_at                     | timestamp with time zone    | NO          | now()
 sequence_enrollments          | completed_at                    | timestamp with time zone    | YES         | 
 sequence_enrollments          | unsubscribed_at                 | timestamp with time zone    | YES         | 
 sequence_enrollments          | enrolled_by                     | uuid                        | YES         | 
 sequence_enrollments          | metadata                        | jsonb                       | YES         | '{}'::jsonb
 sequence_performance          | id                              | uuid                        | YES         | 
 sequence_performance          | name                            | text                        | YES         | 
 sequence_performance          | status                          | text                        | YES         | 
 sequence_performance          | total_steps                     | integer                     | YES         | 
 sequence_performance          | total_duration_days             | integer                     | YES         | 
 sequence_performance          | total_enrollments               | bigint                      | YES         | 
 sequence_performance          | active_enrollments              | bigint                      | YES         | 
 sequence_performance          | completed_enrollments           | bigint                      | YES         | 
 sequence_performance          | emails_sent                     | bigint                      | YES         | 
 sequence_performance          | emails_opened                   | bigint                      | YES         | 
 sequence_performance          | emails_clicked                  | bigint                      | YES         | 
 sequence_performance          | emails_replied                  | bigint                      | YES         | 
 sequence_performance          | open_rate                       | numeric                     | YES         | 
 sequence_performance          | created_at                      | timestamp with time zone    | YES         | 
 sequence_step_logs            | id                              | uuid                        | NO          | gen_random_uuid()
 sequence_step_logs            | enrollment_id                   | uuid                        | NO          | 
 sequence_step_logs            | step_id                         | uuid                        | YES         | 
 sequence_step_logs            | step_number                     | integer                     | NO          | 
 sequence_step_logs            | status                          | text                        | YES         | 'pending'::text
 sequence_step_logs            | scheduled_at                    | timestamp with time zone    | NO          | 
 sequence_step_logs            | sent_at                         | timestamp with time zone    | YES         | 
 sequence_step_logs            | opened_at                       | timestamp with time zone    | YES         | 
 sequence_step_logs            | clicked_at                      | timestamp with time zone    | YES         | 
 sequence_step_logs            | replied_at                      | timestamp with time zone    | YES         | 
 sequence_step_logs            | error_message                   | text                        | YES         | 
 sequence_step_logs            | metadata                        | jsonb                       | YES         | '{}'::jsonb
 sequence_step_logs            | created_at                      | timestamp with time zone    | NO          | now()
 sequence_steps                | id                              | uuid                        | NO          | gen_random_uuid()
 sequence_steps                | sequence_id                     | uuid                        | NO          | 
 sequence_steps                | step_number                     | integer                     | NO          | 
 sequence_steps                | type                            | text                        | NO          | 
 sequence_steps                | subject                         | text                        | YES         | 
 sequence_steps                | body                            | text                        | YES         | 
 sequence_steps                | delay_days                      | integer                     | YES         | 0
 sequence_steps                | delay_hours                     | integer                     | YES         | 0
 sequence_steps                | task_title                      | text                        | YES         | 
 sequence_steps                | task_description                | text                        | YES         | 
 sequence_steps                | call_script                     | text                        | YES         | 
 sequence_steps                | is_active                       | boolean                     | YES         | true
 sequence_steps                | created_at                      | timestamp with time zone    | NO          | now()
 sequences                     | id                              | uuid                        | NO          | gen_random_uuid()
 sequences                     | tenant_id                       | uuid                        | NO          | 
 sequences                     | name                            | text                        | NO          | 
 sequences                     | description                     | text                        | YES         | 
 sequences                     | status                          | text                        | YES         | 'draft'::text
 sequences                     | total_steps                     | integer                     | YES         | 0
 sequences                     | total_duration_days             | integer                     | YES         | 0
 sequences                     | created_by                      | uuid                        | YES         | 
 sequences                     | created_at                      | timestamp with time zone    | NO          | now()
 sequences                     | updated_at                      | timestamp with time zone    | NO          | now()
 sequences                     | stats                           | jsonb                       | YES         | '{"sent": 0, "opened": 0, "clicked": 0, "replied": 0, "unsubscribed": 0}'::jsonb
 sessions                      | id                              | uuid                        | NO          | gen_random_uuid()
 sessions                      | user_id                         | uuid                        | NO          | 
 sessions                      | token_hash                      | text                        | NO          | 
 sessions                      | ip_address                      | text                        | YES         | 
 sessions                      | user_agent                      | text                        | YES         | 
 sessions                      | expires_at                      | timestamp with time zone    | NO          | 
 sessions                      | created_at                      | timestamp with time zone    | NO          | now()
 subscriptions                 | id                              | uuid                        | NO          | gen_random_uuid()
 subscriptions                 | tenant_id                       | uuid                        | NO          | 
 subscriptions                 | plan_id                         | uuid                        | NO          | 
 subscriptions                 | stripe_subscription_id          | text                        | YES         | 
 subscriptions                 | stripe_customer_id              | text                        | YES         | 
 subscriptions                 | status                          | text                        | NO          | 'trialing'::text
 subscriptions                 | current_period_start            | timestamp with time zone    | YES         | 
 subscriptions                 | current_period_end              | timestamp with time zone    | YES         | 
 subscriptions                 | cancel_at_period_end            | boolean                     | YES         | false
 subscriptions                 | created_at                      | timestamp with time zone    | NO          | now()
 subscriptions                 | updated_at                      | timestamp with time zone    | NO          | now()
 super_admin_backups           | id                              | uuid                        | NO          | gen_random_uuid()
 super_admin_backups           | file_name                       | character varying           | NO          | 
 super_admin_backups           | file_size                       | bigint                      | NO          | 0
 super_admin_backups           | file_hash                       | character varying           | YES         | 
 super_admin_backups           | backup_type                     | character varying           | YES         | 'full'::character varying
 super_admin_backups           | parsed_at                       | timestamp without time zone | YES         | 
 super_admin_backups           | parse_status                    | character varying           | YES         | 'pending'::character varying
 super_admin_backups           | parse_error                     | text                        | YES         | 
 super_admin_backups           | tenants_included                | jsonb                       | YES         | 
 super_admin_backups           | total_record_count              | bigint                      | YES         | 0
 super_admin_backups           | tables_available                | jsonb                       | YES         | 
 super_admin_backups           | backup_date_range               | jsonb                       | YES         | 
 super_admin_backups           | uploaded_by                     | uuid                        | YES         | 
 super_admin_backups           | uploaded_at                     | timestamp without time zone | NO          | now()
 super_admin_backups           | local_file_path                 | character varying           | YES         | 
 super_admin_backups           | expires_at                      | timestamp without time zone | YES         | 
 super_admin_backups           | metadata                        | jsonb                       | YES         | 
 support_tickets               | id                              | uuid                        | NO          | gen_random_uuid()
 support_tickets               | tenant_id                       | uuid                        | NO          | 
 support_tickets               | created_by                      | uuid                        | YES         | 
 support_tickets               | subject                         | text                        | NO          | 
 support_tickets               | body                            | text                        | YES         | 
 support_tickets               | category                        | text                        | YES         | 'bug'::text
 support_tickets               | priority                        | text                        | YES         | 'medium'::text
 support_tickets               | status                          | text                        | NO          | 'open'::text
 support_tickets               | assigned_to                     | uuid                        | YES         | 
 support_tickets               | resolved_at                     | timestamp with time zone    | YES         | 
 support_tickets               | resolved_by                     | uuid                        | YES         | 
 support_tickets               | created_at                      | timestamp with time zone    | NO          | now()
 support_tickets               | updated_at                      | timestamp with time zone    | NO          | now()
 tags                          | id                              | uuid                        | NO          | gen_random_uuid()
 tags                          | tenant_id                       | uuid                        | NO          | 
 tags                          | name                            | text                        | NO          | 
 tags                          | color                           | text                        | YES         | '#6b7280'::text
 tags                          | created_at                      | timestamp with time zone    | NO          | now()
 tasks                         | id                              | uuid                        | NO          | gen_random_uuid()
 tasks                         | tenant_id                       | uuid                        | NO          | 
 tasks                         | title                           | text                        | NO          | 
 tasks                         | description                     | text                        | YES         | 
 tasks                         | due_date                        | timestamp with time zone    | YES         | 
 tasks                         | priority                        | text                        | YES         | 'medium'::text
 tasks                         | contact_id                      | uuid                        | YES         | 
 tasks                         | deal_id                         | uuid                        | YES         | 
 tasks                         | assigned_to                     | uuid                        | YES         | 
 tasks                         | completed                       | boolean                     | YES         | false
 tasks                         | completed_at                    | timestamp with time zone    | YES         | 
 tasks                         | created_by                      | uuid                        | YES         | 
 tasks                         | created_at                      | timestamp with time zone    | NO          | now()
 tasks                         | updated_at                      | timestamp with time zone    | NO          | now()
 tasks                         | deleted_at                      | timestamp with time zone    | YES         | 
 tasks                         | status                          | text                        | YES         | 'pending'::text
 tasks                         | company_id                      | uuid                        | YES         | 
 tasks                         | deleted_by                      | uuid                        | YES         | 
 tenant_members                | id                              | uuid                        | NO          | gen_random_uuid()
 tenant_members                | tenant_id                       | uuid                        | NO          | 
 tenant_members                | user_id                         | uuid                        | NO          | 
 tenant_members                | role_slug                       | text                        | NO          | 'viewer'::text
 tenant_members                | role_id                         | uuid                        | YES         | 
 tenant_members                | status                          | text                        | NO          | 'active'::text
 tenant_members                | joined_at                       | timestamp with time zone    | NO          | now()
 tenant_members                | created_at                      | timestamp with time zone    | YES         | now()
 tenant_token_limits           | id                              | uuid                        | NO          | gen_random_uuid()
 tenant_token_limits           | tenant_id                       | uuid                        | NO          | 
 tenant_token_limits           | openai_monthly_limit            | bigint                      | YES         | '-1'::integer
 tenant_token_limits           | whatsapp_monthly_msgs           | bigint                      | YES         | '-1'::integer
 tenant_token_limits           | voice_monthly_mins              | bigint                      | YES         | '-1'::integer
 tenant_token_limits           | content_monthly_gen             | bigint                      | YES         | '-1'::integer
 tenant_token_limits           | proposal_monthly_gen            | bigint                      | YES         | '-1'::integer
 tenant_token_limits           | followup_monthly_cnt            | bigint                      | YES         | '-1'::integer
 tenant_token_limits           | score_monthly_cnt               | bigint                      | YES         | '-1'::integer
 tenant_token_limits           | total_monthly_cost              | bigint                      | YES         | '-1'::integer
 tenant_token_limits           | hard_cap_action                 | text                        | YES         | 'block'::text
 tenant_token_limits           | override_reason                 | text                        | YES         | 
 tenant_token_limits           | set_by                          | uuid                        | YES         | 
 tenant_token_limits           | created_at                      | timestamp with time zone    | YES         | now()
 tenant_token_limits           | updated_at                      | timestamp with time zone    | YES         | now()
 tenants                       | id                              | uuid                        | NO          | gen_random_uuid()
 tenants                       | name                            | text                        | NO          | 
 tenants                       | slug                            | text                        | NO          | 
 tenants                       | owner_id                        | uuid                        | NO          | 
 tenants                       | plan_id                         | uuid                        | YES         | 
 tenants                       | status                          | text                        | NO          | 'trialing'::text
 tenants                       | trial_ends_at                   | timestamp with time zone    | YES         | 
 tenants                       | primary_color                   | text                        | YES         | '#7c3aed'::text
 tenants                       | logo_url                        | text                        | YES         | 
 tenants                       | settings                        | jsonb                       | YES         | '{}'::jsonb
 tenants                       | created_at                      | timestamp with time zone    | NO          | now()
 tenants                       | updated_at                      | timestamp with time zone    | NO          | now()
 tenants                       | deleted_at                      | timestamp with time zone    | YES         | 
 tenants                       | current_users                   | integer                     | YES         | 0
 tenants                       | current_contacts                | integer                     | YES         | 0
 tenants                       | current_deals                   | integer                     | YES         | 0
 tenants                       | usage_data                      | jsonb                       | YES         | '{}'::jsonb
 tenants                       | domain                          | text                        | YES         | 
 token_budgets                 | id                              | uuid                        | NO          | gen_random_uuid()
 token_budgets                 | service                         | text                        | NO          | 
 token_budgets                 | monthly_budget_cents            | bigint                      | NO          | 0
 token_budgets                 | current_month_cents             | bigint                      | NO          | 0
 token_budgets                 | alert_at_50pct                  | boolean                     | YES         | true
 token_budgets                 | alert_at_80pct                  | boolean                     | YES         | true
 token_budgets                 | alert_at_100pct                 | boolean                     | YES         | true
 token_budgets                 | hard_cap_enabled                | boolean                     | YES         | true
 token_budgets                 | soft_cap_enabled                | boolean                     | YES         | true
 token_budgets                 | billing_period                  | text                        | NO          | to_char(now(), 'YYYY-MM'::text)
 token_budgets                 | reset_day                       | integer                     | YES         | 1
 token_budgets                 | created_at                      | timestamp with time zone    | YES         | now()
 token_budgets                 | updated_at                      | timestamp with time zone    | YES         | now()
 top_scored_contacts           | id                              | uuid                        | YES         | 
 top_scored_contacts           | contact_id                      | uuid                        | YES         | 
 top_scored_contacts           | tenant_id                       | uuid                        | YES         | 
 top_scored_contacts           | overall_score                   | integer                     | YES         | 
 top_scored_contacts           | engagement_score                | integer                     | YES         | 
 top_scored_contacts           | fit_score                       | integer                     | YES         | 
 top_scored_contacts           | intent_score                    | integer                     | YES         | 
 top_scored_contacts           | score_factors                   | jsonb                       | YES         | 
 top_scored_contacts           | last_calculated_at              | timestamp with time zone    | YES         | 
 top_scored_contacts           | created_at                      | timestamp with time zone    | YES         | 
 top_scored_contacts           | first_name                      | text                        | YES         | 
 top_scored_contacts           | last_name                       | text                        | YES         | 
 top_scored_contacts           | email                           | text                        | YES         | 
 top_scored_contacts           | company_id                      | uuid                        | YES         | 
 top_scored_contacts           | company_name                    | text                        | YES         | 
 top_scored_contacts           | lead_status                     | text                        | YES         | 
 top_scored_contacts           | lifecycle_stage                 | text                        | YES         | 
 usage_alerts                  | id                              | uuid                        | NO          | gen_random_uuid()
 usage_alerts                  | alert_type                      | text                        | NO          | 
 usage_alerts                  | target_type                     | text                        | NO          | 
 usage_alerts                  | target_id                       | uuid                        | YES         | 
 usage_alerts                  | service                         | text                        | YES         | 
 usage_alerts                  | current_value                   | bigint                      | YES         | 
 usage_alerts                  | threshold_value                 | bigint                      | YES         | 
 usage_alerts                  | message                         | text                        | YES         | 
 usage_alerts                  | notification_sent               | text                        | YES         | 
 usage_alerts                  | acknowledged                    | boolean                     | YES         | false
 usage_alerts                  | acknowledged_by                 | uuid                        | YES         | 
 usage_alerts                  | acknowledged_at                 | timestamp with time zone    | YES         | 
 usage_alerts                  | created_at                      | timestamp with time zone    | YES         | now()
 user_call_performance         | user_id                         | uuid                        | YES         | 
 user_call_performance         | full_name                       | text                        | YES         | 
 user_call_performance         | email                           | text                        | YES         | 
 user_call_performance         | calls_this_month                | bigint                      | YES         | 
 user_call_performance         | avg_score_this_month            | numeric                     | YES         | 
 user_call_performance         | avg_duration_this_month         | numeric                     | YES         | 
 user_call_performance         | calls_last_month                | bigint                      | YES         | 
 user_call_performance         | avg_score_last_month            | numeric                     | YES         | 
 user_call_performance         | total_calls                     | bigint                      | YES         | 
 user_call_performance         | all_time_avg_score              | numeric                     | YES         | 
 user_token_limits             | id                              | uuid                        | NO          | gen_random_uuid()
 user_token_limits             | tenant_id                       | uuid                        | NO          | 
 user_token_limits             | user_id                         | uuid                        | NO          | 
 user_token_limits             | module                          | text                        | NO          | 
 user_token_limits             | daily_limit                     | bigint                      | YES         | '-1'::integer
 user_token_limits             | monthly_limit                   | bigint                      | YES         | '-1'::integer
 user_token_limits             | max_cost_per_call               | bigint                      | YES         | '-1'::integer
 user_token_limits             | created_at                      | timestamp with time zone    | YES         | now()
 users                         | id                              | uuid                        | NO          | gen_random_uuid()
 users                         | email                           | text                        | NO          | 
 users                         | password_hash                   | text                        | NO          | 
 users                         | full_name                       | text                        | NO          | ''::text
 users                         | avatar_url                      | text                        | YES         | 
 users                         | is_super_admin                  | boolean                     | NO          | false
 users                         | email_verified                  | boolean                     | NO          | false
 users                         | totp_enabled                    | boolean                     | NO          | false
 users                         | totp_secret                     | text                        | YES         | 
 users                         | totp_backup_codes               | jsonb                       | YES         | '[]'::jsonb
 users                         | last_tenant_id                  | uuid                        | YES         | 
 users                         | phone                           | text                        | YES         | 
 users                         | timezone                        | text                        | YES         | 'UTC'::text
 users                         | locale                          | text                        | YES         | 'en'::text
 users                         | theme                           | text                        | YES         | 'light'::text
 users                         | telegram_bot_token              | text                        | YES         | 
 users                         | telegram_chat_id                | text                        | YES         | 
 users                         | telegram_enabled                | boolean                     | YES         | false
 users                         | telegram_notify_login           | boolean                     | YES         | true
 users                         | telegram_notify_signup          | boolean                     | YES         | true
 users                         | telegram_notify_password_change | boolean                     | YES         | true
 users                         | telegram_notify_2fa_change      | boolean                     | YES         | true
 users                         | telegram_notify_security_alerts | boolean                     | YES         | true
 users                         | created_at                      | timestamp with time zone    | NO          | now()
 users                         | updated_at                      | timestamp with time zone    | NO          | now()
 users                         | deleted_at                      | timestamp with time zone    | YES         | 
 webhook_deliveries            | id                              | uuid                        | NO          | gen_random_uuid()
 webhook_deliveries            | webhook_id                      | uuid                        | NO          | 
 webhook_deliveries            | url                             | text                        | NO          | 
 webhook_deliveries            | method                          | text                        | NO          | 'POST'::text
 webhook_deliveries            | headers                         | jsonb                       | YES         | '{}'::jsonb
 webhook_deliveries            | payload                         | jsonb                       | NO          | 
 webhook_deliveries            | status                          | text                        | NO          | 'pending'::text
 webhook_deliveries            | attempt                         | integer                     | NO          | 0
 webhook_deliveries            | max_retries                     | integer                     | NO          | 3
 webhook_deliveries            | response_status                 | integer                     | YES         | 
 webhook_deliveries            | response_body                   | text                        | YES         | 
 webhook_deliveries            | error_message                   | text                        | YES         | 
 webhook_deliveries            | delivered_at                    | timestamp with time zone    | YES         | 
 webhook_deliveries            | failed_at                       | timestamp with time zone    | YES         | 
 webhook_deliveries            | next_retry_at                   | timestamp with time zone    | YES         | 
 webhook_deliveries            | created_at                      | timestamp with time zone    | NO          | now()
 webhook_deliveries            | updated_at                      | timestamp with time zone    | NO          | now()
 webhook_inbound_logs          | id                              | uuid                        | NO          | gen_random_uuid()
 webhook_inbound_logs          | tenant_id                       | uuid                        | NO          | 
 webhook_inbound_logs          | api_key_id                      | uuid                        | YES         | 
 webhook_inbound_logs          | action                          | text                        | YES         | 
 webhook_inbound_logs          | entity                          | text                        | YES         | 
 webhook_inbound_logs          | status                          | text                        | YES         | 
 webhook_inbound_logs          | status_code                     | integer                     | YES         | 
 webhook_inbound_logs          | error_message                   | text                        | YES         | 
 webhook_inbound_logs          | record_id                       | uuid                        | YES         | 
 webhook_inbound_logs          | payload_size                    | integer                     | YES         | 
 webhook_inbound_logs          | created_at                      | timestamp with time zone    | NO          | now()
 webhooks                      | id                              | uuid                        | NO          | gen_random_uuid()
 webhooks                      | tenant_id                       | uuid                        | NO          | 
 webhooks                      | name                            | text                        | NO          | 
 webhooks                      | url                             | text                        | NO          | 
 webhooks                      | secret                          | text                        | YES         | 
 webhooks                      | events                          | jsonb                       | NO          | '[]'::jsonb
 webhooks                      | is_active                       | boolean                     | YES         | true
 webhooks                      | created_at                      | timestamp with time zone    | NO          | now()
 webhooks                      | updated_at                      | timestamp with time zone    | NO          | now()
 whatsapp_messages             | id                              | uuid                        | NO          | gen_random_uuid()
 whatsapp_messages             | tenant_id                       | uuid                        | NO          | 
 whatsapp_messages             | contact_id                      | uuid                        | YES         | 
 whatsapp_messages             | from_number                     | text                        | NO          | 
 whatsapp_messages             | to_number                       | text                        | NO          | 
 whatsapp_messages             | direction                       | text                        | NO          | 
 whatsapp_messages             | message_type                    | text                        | YES         | 'text'::text
 whatsapp_messages             | body                            | text                        | YES         | 
 whatsapp_messages             | status                          | text                        | YES         | 'pending'::text
 whatsapp_messages             | meta_data                       | jsonb                       | YES         | '{}'::jsonb
 whatsapp_messages             | error_code                      | text                        | YES         | 
 whatsapp_messages             | error_message                   | text                        | YES         | 
 whatsapp_messages             | sent_at                         | timestamp with time zone    | YES         | 
 whatsapp_messages             | delivered_at                    | timestamp with time zone    | YES         | 
 whatsapp_messages             | read_at                         | timestamp with time zone    | YES         | 
 whatsapp_messages             | received_at                     | timestamp with time zone    | YES         | 
 whatsapp_messages             | created_at                      | timestamp with time zone    | NO          | now()
 workflow_action_logs          | id                              | uuid                        | NO          | gen_random_uuid()
 workflow_action_logs          | execution_id                    | uuid                        | NO          | 
 workflow_action_logs          | action_id                       | uuid                        | YES         | 
 workflow_action_logs          | action_type                     | text                        | NO          | 
 workflow_action_logs          | action_order                    | integer                     | NO          | 
 workflow_action_logs          | status                          | text                        | YES         | 'pending'::text
 workflow_action_logs          | input_data                      | jsonb                       | YES         | '{}'::jsonb
 workflow_action_logs          | output_data                     | jsonb                       | YES         | '{}'::jsonb
 workflow_action_logs          | error_message                   | text                        | YES         | 
 workflow_action_logs          | executed_at                     | timestamp with time zone    | NO          | now()
 workflow_action_logs          | duration_ms                     | integer                     | YES         | 0
 workflow_actions              | id                              | uuid                        | NO          | gen_random_uuid()
 workflow_actions              | workflow_id                     | uuid                        | NO          | 
 workflow_actions              | action_order                    | integer                     | NO          | 
 workflow_actions              | action_type                     | text                        | NO          | 
 workflow_actions              | action_config                   | jsonb                       | NO          | 
 workflow_actions              | condition_type                  | text                        | YES         | 'always'::text
 workflow_actions              | condition_config                | jsonb                       | YES         | '{}'::jsonb
 workflow_actions              | is_active                       | boolean                     | YES         | true
 workflow_actions              | created_at                      | timestamp with time zone    | NO          | now()
 workflow_execution_logs       | id                              | uuid                        | NO          | gen_random_uuid()
 workflow_execution_logs       | workflow_id                     | uuid                        | NO          | 
 workflow_execution_logs       | trigger_entity_type             | text                        | NO          | 
 workflow_execution_logs       | trigger_entity_id               | uuid                        | NO          | 
 workflow_execution_logs       | status                          | text                        | YES         | 'running'::text
 workflow_execution_logs       | started_at                      | timestamp with time zone    | NO          | now()
 workflow_execution_logs       | completed_at                    | timestamp with time zone    | YES         | 
 workflow_execution_logs       | error_message                   | text                        | YES         | 
 workflow_execution_logs       | metadata                        | jsonb                       | YES         | '{}'::jsonb
 workflow_execution_logs       | actions_executed                | jsonb                       | YES         | '[]'::jsonb
 workflow_performance          | id                              | uuid                        | YES         | 
 workflow_performance          | name                            | text                        | YES         | 
 workflow_performance          | status                          | text                        | YES         | 
 workflow_performance          | trigger_type                    | text                        | YES         | 
 workflow_performance          | run_count                       | integer                     | YES         | 
 workflow_performance          | last_run_at                     | timestamp with time zone    | YES         | 
 workflow_performance          | executions_30d                  | bigint                      | YES         | 
 workflow_performance          | success_rate_30d                | numeric                     | YES         | 
 workflow_performance          | avg_duration_ms                 | integer                     | YES         | 
 workflows                     | id                              | uuid                        | NO          | gen_random_uuid()
 workflows                     | tenant_id                       | uuid                        | NO          | 
 workflows                     | name                            | text                        | NO          | 
 workflows                     | description                     | text                        | YES         | 
 workflows                     | status                          | text                        | YES         | 'draft'::text
 workflows                     | trigger_type                    | text                        | NO          | 
 workflows                     | trigger_config                  | jsonb                       | YES         | '{}'::jsonb
 workflows                     | nodes                           | jsonb                       | YES         | '[]'::jsonb
 workflows                     | is_published                    | boolean                     | YES         | false
 workflows                     | version                         | integer                     | YES         | 1
 workflows                     | run_count                       | integer                     | YES         | 0
 workflows                     | last_run_at                     | timestamp with time zone    | YES         | 
 workflows                     | created_by                      | uuid                        | YES         | 
 workflows                     | created_at                      | timestamp with time zone    | NO          | now()
 workflows                     | updated_at                      | timestamp with time zone    | NO          | now()
(1187 rows)

