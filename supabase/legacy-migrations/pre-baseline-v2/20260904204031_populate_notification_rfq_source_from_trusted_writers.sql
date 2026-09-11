do $migration$
declare
  v_proc text;
  v_award text;
  v_old text;
  v_new text;
  v_count integer;
begin
  select pg_get_functiondef('public.record_procurement_activity(text,uuid)'::regprocedure)
  into v_proc;

  if md5(v_proc) <> 'de6c1c4ab00aaf3a630103c988696a5c' then
    raise exception 'record_procurement_activity definition changed after 8-10 review';
  end if;

  select pg_get_functiondef('public.record_rfq_award_workspace_activity(uuid,uuid,text)'::regprocedure)
  into v_award;

  if md5(v_award) <> '30dfff294c0cfe2151456ac1d18c558e' then
    raise exception 'record_rfq_award_workspace_activity definition changed after 8-10 review';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'source_rfq_id'
      and data_type = 'uuid'
      and is_nullable = 'YES'
  ) then
    raise exception 'notifications.source_rfq_id contract is not installed';
  end if;

  v_proc := replace(v_proc, E'\r\n', E'\n');
  v_award := replace(v_award, E'\r\n', E'\n');

  -- record_procurement_activity: authoritative source slot.
  v_old := E'  notification_company_id uuid;\n  existing_audit_id uuid;';
  v_new := E'  notification_company_id uuid;\n  notification_source_rfq_id uuid;\n  existing_audit_id uuid;';
  if position(v_old in v_proc) = 0 then raise exception 'procurement declaration anchor missing'; end if;
  v_proc := replace(v_proc, v_old, v_new);

  v_old := E'    notification_message := coalesce(rfq_row.title, ''Untitled RFQ'')';
  v_new := E'    notification_source_rfq_id := rfq_row.id;\n    notification_message := coalesce(rfq_row.title, ''Untitled RFQ'')';
  if position(v_old in v_proc) = 0 then raise exception 'rfq_created source anchor missing'; end if;
  v_proc := replace(v_proc, v_old, v_new);

  v_old := E'    select a.id\n    into existing_audit_id\n    from public.audit_logs a\n    where a.action = ''QUOTE_SUBMITTED''';
  v_new := E'    notification_source_rfq_id := quote_row.rfq_id;\n\n    select a.id\n    into existing_audit_id\n    from public.audit_logs a\n    where a.action = ''QUOTE_SUBMITTED''';
  if position(v_old in v_proc) = 0 then raise exception 'quote_submitted source anchor missing'; end if;
  v_proc := replace(v_proc, v_old, v_new);

  v_old := E'    audit_action := ''RFQ_INVITATION_SENT'';';
  v_new := E'    notification_source_rfq_id := rfq_row.id;\n    audit_action := ''RFQ_INVITATION_SENT'';';
  if position(v_old in v_proc) = 0 then raise exception 'rfq_invitation_sent source anchor missing'; end if;
  v_proc := replace(v_proc, v_old, v_new);

  v_old := E'    audit_action := ''RFI_SUBMITTED'';';
  v_new := E'    notification_source_rfq_id := rfi_row.rfq_id;\n    audit_action := ''RFI_SUBMITTED'';';
  if position(v_old in v_proc) = 0 then raise exception 'rfi_submitted source anchor missing'; end if;
  v_proc := replace(v_proc, v_old, v_new);

  v_old := E'    audit_action := ''RFI_RESPONDED'';';
  v_new := E'    notification_source_rfq_id := rfi_row.rfq_id;\n    audit_action := ''RFI_RESPONDED'';';
  if position(v_old in v_proc) = 0 then raise exception 'rfi_responded source anchor missing'; end if;
  v_proc := replace(v_proc, v_old, v_new);

  v_old := E'    issuer_company_id := rfq_row.company_id;';
  v_new := E'    notification_source_rfq_id := addendum_row.rfq_id;\n    issuer_company_id := rfq_row.company_id;';
  if position(v_old in v_proc) = 0 then raise exception 'addendum_published source anchor missing'; end if;
  v_proc := replace(v_proc, v_old, v_new);

  v_old := E'    audit_action := ''ADDENDUM_ACKNOWLEDGED'';';
  v_new := E'    notification_source_rfq_id := acknowledgement_row.rfq_id;\n    audit_action := ''ADDENDUM_ACKNOWLEDGED'';';
  if position(v_old in v_proc) = 0 then raise exception 'addendum_acknowledged source anchor missing'; end if;
  v_proc := replace(v_proc, v_old, v_new);

  -- Seven normal procurement notification column lists.
  v_old := E'      is_read,\n      company_id\n    )\n    values (';
  v_count := (length(v_proc) - length(replace(v_proc, v_old, ''))) / length(v_old);
  if v_count <> 7 then raise exception 'expected 7 normal procurement notification column lists, found %', v_count; end if;
  v_new := E'      is_read,\n      company_id,\n      source_rfq_id\n    )\n    values (';
  v_proc := replace(v_proc, v_old, v_new);

  -- One respondent fanout list.
  v_old := E'        is_read,\n        company_id\n      )\n      values (';
  v_count := (length(v_proc) - length(replace(v_proc, v_old, ''))) / length(v_old);
  if v_count <> 1 then raise exception 'expected 1 respondent fanout notification column list, found %', v_count; end if;
  v_new := E'        is_read,\n        company_id,\n        source_rfq_id\n      )\n      values (';
  v_proc := replace(v_proc, v_old, v_new);

  v_old := E'      false,\n      rfq_row.company_id\n    )\n    returning id into written_notification_id;';
  v_new := E'      false,\n      rfq_row.company_id,\n      notification_source_rfq_id\n    )\n    returning id into written_notification_id;';
  if position(v_old in v_proc) = 0 then raise exception 'rfq_created notification values anchor missing'; end if;
  v_proc := replace(v_proc, v_old, v_new);

  v_old := E'      false,\n      buyer_company_id\n    )\n    returning id into written_notification_id;';
  v_new := E'      false,\n      buyer_company_id,\n      notification_source_rfq_id\n    )\n    returning id into written_notification_id;';
  if position(v_old in v_proc) = 0 then raise exception 'quote_submitted notification values anchor missing'; end if;
  v_proc := replace(v_proc, v_old, v_new);

  v_old := E'      false,\n      notification_company_id\n    )';
  v_count := (length(v_proc) - length(replace(v_proc, v_old, ''))) / length(v_old);
  if v_count <> 5 then raise exception 'expected 5 notification_company_id values blocks, found %', v_count; end if;
  v_new := E'      false,\n      notification_company_id,\n      notification_source_rfq_id\n    )';
  v_proc := replace(v_proc, v_old, v_new);

  v_old := E'        false,\n        respondent_company_id\n      );';
  v_new := E'        false,\n        respondent_company_id,\n        notification_source_rfq_id\n      );';
  if position(v_old in v_proc) = 0 then raise exception 'addendum respondent notification values anchor missing'; end if;
  v_proc := replace(v_proc, v_old, v_new);

  v_count := (length(v_proc) - length(replace(v_proc, 'notification_source_rfq_id', ''))) / length('notification_source_rfq_id');
  if v_count <> 16 then raise exception 'unexpected procurement source transform count: %', v_count; end if;

  execute v_proc;

  -- record_rfq_award_workspace_activity: issuer notification column list.
  v_old := E'      is_read,\n      company_id\n    )\n    values (';
  v_count := (length(v_award) - length(replace(v_award, v_old, ''))) / length(v_old);
  if v_count <> 1 then raise exception 'expected 1 issuer award notification column list, found %', v_count; end if;
  v_new := E'      is_read,\n      company_id,\n      source_rfq_id\n    )\n    values (';
  v_award := replace(v_award, v_old, v_new);

  -- Supplier notification column list has shallower indentation.
  v_old := E'    is_read,\n    company_id\n  )\n  values (';
  v_count := (length(v_award) - length(replace(v_award, v_old, ''))) / length(v_old);
  if v_count <> 1 then raise exception 'expected 1 supplier award notification column list, found %', v_count; end if;
  v_new := E'    is_read,\n    company_id,\n    source_rfq_id\n  )\n  values (';
  v_award := replace(v_award, v_old, v_new);

  v_old := E'      false,\n      rfq_row.company_id\n    );';
  v_new := E'      false,\n      rfq_row.company_id,\n      rfq_row.id\n    );';
  if position(v_old in v_award) = 0 then raise exception 'issuer award notification values anchor missing'; end if;
  v_award := replace(v_award, v_old, v_new);

  v_old := E'    false,\n    awarded_quote.company_id\n  );';
  v_new := E'    false,\n    awarded_quote.company_id,\n    rfq_row.id\n  );';
  if position(v_old in v_award) = 0 then raise exception 'supplier award notification values anchor missing'; end if;
  v_award := replace(v_award, v_old, v_new);

  v_count := (length(v_award) - length(replace(v_award, 'source_rfq_id', ''))) / length('source_rfq_id');
  if v_count <> 2 then raise exception 'unexpected award source transform count: %', v_count; end if;

  execute v_award;
end;
$migration$;