-- M4: authors may remove their own ideas; users may un-save ideas. (Kept separate from m4_ideas.)
create policy ideas_delete on public.ideas for delete using (author_id = auth.uid());
create policy saved_ideas_delete on public.saved_ideas for delete using (profile_id = auth.uid());
grant delete on public.ideas, public.saved_ideas to authenticated;
