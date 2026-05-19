-- Enable realtime for tables that need live updates in the UI.
-- The supabase_realtime publication must include each table explicitly.

alter publication supabase_realtime add table case_task_progress;
alter publication supabase_realtime add table case_stage_progress;
alter publication supabase_realtime add table deadlines;
alter publication supabase_realtime add table case_documents;
