alter table public.notifications
  add column source_rfq_id uuid;

alter table public.notifications
  add constraint notifications_source_rfq_id_fkey
  foreign key (source_rfq_id)
  references public.rfqs(id)
  on delete set null;

create index notifications_source_rfq_id_idx
  on public.notifications(source_rfq_id);

comment on column public.notifications.source_rfq_id is
  'Canonical nullable RFQ source projection for Activity Center traceability.';