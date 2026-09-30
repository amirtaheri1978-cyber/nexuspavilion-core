# Intelligent Procurement — Create RFQ

**Status:** Launch documentation  
**Task:** 20-03 — Create RFQ  
**Product:** Intelligent Procurement  
**Corporate parent:** Nexus Pavilion Inc.

## Purpose

An RFQ is the governed procurement workspace used by an issuing organization to define a commercial request, control market access, collect respondent submissions, manage clarifications, and support later evaluation and award.

RFQ creation is available at `/rfq/new` for authorized Company Workspace users. Publishing an RFQ creates a new procurement identity owned by the issuing company. It does not invite suppliers automatically, expose commercial submissions before the governed opening, or make an award decision.

## 1. Who can create an RFQ

RFQ creation requires:

- an authenticated Intelligent Procurement account;
- a Company Workspace connected to the signed-in profile;
- an active membership for that company; and
- authorization as either a **workspace owner**, **workspace admin**, or a member whose **procurement function is buyer**.

Viewer access is not sufficient.

If the product cannot verify the Company Workspace membership, publication is blocked rather than falling back to weaker authorization.

## 2. Start the RFQ wizard

Open:

`/rfq/new`

The creation workflow is organized into five steps:

1. **Project**
2. **Strategy**
3. **Controls**
4. **Documents**
5. **Publish**

The wizard supports a smaller required publication baseline for straightforward RFQs while allowing additional project and enterprise controls for more complex procurement.

Your in-progress draft is automatically saved in the local browser. If a saved draft exists, you can resume it or discard it. A successfully published RFQ clears that local draft.

## 3. Project — establish the procurement package identity

The Project step defines the supplier-facing identity and core scope.

Required publication fields include:

- **RFQ Title** — at least 3 characters;
- **Scope of Work Summary** — at least 9 characters;
- **Category / Trade** — at least 2 characters;
- **Project Location** — at least 2 characters;
- **Submission Closing** — a valid date, time, and IANA timezone.

Optional project context can include:

- Project Name
- Owner / Client
- Internal Project ID
- Budget

The budget is useful commercial context but is not required for publication.

### Scope quality review

The wizard also reviews the scope summary for practical procurement signals such as:

- inclusions, exclusions, allowances, alternates, or work by others;
- site conditions, access, shutdowns, phasing, logistics, or working hours;
- technical basis such as drawings, specifications, standards, performance criteria, testing, or commissioning;
- execution timing, milestones, duration, mobilization, or completion.

These review signals help identify scope areas worth checking before supplier pricing. They are decision support, not a substitute for the issuer's professional review.

## 4. Strategy — define how the RFQ will operate

Choose one value from each strategy group.

### Procurement Scope

| Option | Use |
| --- | --- |
| **Material / Product RFQ** | Materials, manufactured products, systems, or equipment components |
| **Subcontractor / Trade RFQ** | Trade-contractor work packages |
| **Equipment Rental RFQ** | Machinery, temporary systems, tools, or site equipment |
| **Professional Service RFQ** | Design, engineering, consulting, cost, planning, or advisory services |

### Sourcing Method

| Option | Meaning |
| --- | --- |
| **Open RFQ** | Market access is open to qualified responding organizations |
| **Invited / Selective RFQ** | Access is limited to the applicable invited or otherwise authorized respondents |
| **Sealed Bid RFQ** | Respondents submit under the governed sealed-bid access and confidentiality model |

**Important:** Open sourcing controls who may participate. It does **not** enable rolling commercial evaluation. For launch, commercial quotation content remains deadline-locked across Open, Invited / Selective, and Sealed Bid RFQs until the submission deadline has passed.

### Contract Framework

| Option | Meaning |
| --- | --- |
| **Project-Specific RFQ** | One procurement request for a defined project or scope |
| **Master / Framework RFQ** | Recurring pricing or preferred-supplier terms across projects |

Contract framework does not bypass RFQ confidentiality or commercial-opening controls.

### Evaluation Model

| Option | Intended use |
| --- | --- |
| **Lump Sum / Lowest Compliant** | Straightforward packages where compliant price is the primary commercial driver |
| **Best Value / Weighted Scoring** | Procurements considering price together with quality, safety, schedule, experience, or other criteria |
| **Construction Management / Fee-Based** | Fee-based or collaborative construction-management procurement |

The selected model informs the procurement context; Intelligent Procurement does not make an autonomous award decision.

## 5. Controls — set deadlines and project governance

The Controls step can include:

- Owner / Client
- Internal Project ID
- RFI / Clarification Deadline
- Target Mobilization Date
- Substantial Completion Date

### Submission deadline

The supplier submission closing must resolve to a valid date, time, and timezone.

The timezone is stored with the RFQ so the system can display and enforce the governed deadline consistently.

### RFI deadline

The RFI deadline is optional. If supplied:

- it must resolve to a valid date/time and timezone; and
- it must be at or before the RFQ submission closing.

The product blocks publication if the RFI deadline is later than submission closing.

### Project schedule

Mobilization and substantial completion are optional. If both are supplied, mobilization must not occur after substantial completion.

Invalid schedule dates block publication.

## 6. Enterprise requirements

The RFQ can record additional procurement requirements, including:

- NDA required
- Performance bond required
- Bid bond required
- Insurance required
- Insurance notes
- Safety requirements
- Prequalification notes

These settings communicate procurement requirements; they do not by themselves prove that a respondent has satisfied them.

## 7. Documents — understand the launch behavior

The RFQ wizard includes a Documents step, but supporting documents are **non-blocking at creation time**.

Drawings, specifications, BOQs, photos, Addenda, and supporting files are configured from the RFQ workspace **after publication**.

Do not delay a valid RFQ solely because the creation wizard does not upload the final document package. After publication, use the governed RFQ document workspace to add and manage the procurement package.

Document availability does not weaken the issuer's responsibility to ensure respondents receive sufficient scope and technical information before pricing.

## 8. Publication readiness

Before publication, Intelligent Procurement evaluates a required readiness baseline.

The required signals are:

1. Clear RFQ title
2. Scope of work summary
3. Category / Trade
4. Project location
5. Valid submission deadline
6. Procurement scope
7. Sourcing method
8. Contract framework
9. Evaluation model

Publication is blocked when a required signal is missing or when the RFI/project-schedule consistency checks fail.

The final review also shows project identity, procurement strategy, controls, schedule, and enterprise requirements so the issuer can correct the appropriate wizard step before publishing.

## 9. Ready to Publish acknowledgement

Passing the automated readiness checks is not enough by itself.

The issuer must explicitly select **Ready to Publish** after reviewing the final RFQ package.

The acknowledgement confirms review of:

- RFQ identity
- scope
- strategy
- evaluation model
- deadlines
- project controls
- enterprise requirements
- current document state
- commercial-opening policy

The API rejects publication when this acknowledgement has not been provided.

## 10. Publish the RFQ

When the required readiness checks pass and **Ready to Publish** is acknowledged, publish the RFQ.

The product then:

1. validates authentication and Company Workspace authorization again;
2. validates the publication requirements again on the server;
3. normalizes the governed deadline and timezone;
4. creates a new RFQ owned by the current company;
5. records the procurement scope, sourcing method, contract framework, evaluation model, project controls, and enterprise requirements;
6. sets the RFQ lifecycle state to **open**;
7. records trusted procurement activity;
8. attempts the configured RFQ-created email notification where delivery configuration permits it; and
9. redirects to the new RFQ workspace at `/rfq/[slug]`.

Server-side validation remains authoritative even if client-side readiness appeared complete.

## 11. Commercial-opening governance

At launch, all current RFQ sourcing types are deadline-locked for commercial evaluation.

Before the submission deadline:

- quote participation may be represented only through safe aggregate paths where supported;
- issuer-side commercial quote amounts, pricing-derived rankings or scores, variance, recommendation, commercial notes, and award actions must remain unavailable;
- Open RFQ does not mean rolling commercial evaluation.

After the submission deadline, eligible commercial evidence can become available according to the governed RFQ state and authorization rules.

## 12. Replacement procurement / reissue

When the creation wizard is opened with a governed replacement-procurement lineage, it creates a **new RFQ identity**.

The new RFQ does not carry forward:

- quotations;
- invitations;
- Addenda;
- acknowledgement records;
- evaluations; or
- award state.

Only the governed lineage to the cancelled predecessor is recorded.

A replacement RFQ cannot:

- reissue itself;
- reference a source RFQ from another issuing company;
- use an invalid or missing predecessor;
- reuse a predecessor that is not in the required cancelled/unawarded state; or
- create an invalid duplicate reissue lineage.

If the lineage is invalid, publication is rejected rather than silently creating an unrelated replacement relationship.

## 13. After publication

After publishing:

1. review the RFQ workspace;
2. add or verify procurement documents;
3. confirm RFI and submission deadlines;
4. review enterprise requirements;
5. use the appropriate supplier-invitation path when the sourcing method permits or requires it;
6. issue formal Addenda for material procurement changes;
7. monitor respondent participation without exposing pre-deadline commercial content;
8. move into commercial evaluation only after the governed opening.

Supplier invitation, respondent access, quotation submission, evaluation, and award are separate lifecycle steps and are documented in the subsequent Phase 20 launch guides.

## 14. Troubleshooting

| Situation | Required action |
| --- | --- |
| "Only owners, admins, and buyers can create RFQs." | Confirm active Company Workspace membership and procurement authorization |
| "No company linked to profile." | Resolve the Company Workspace connection before creating an RFQ |
| Publication readiness is blocked | Use the blocker list and **Edit** action to return to the relevant wizard step |
| RFI deadline is after submission closing | Move the RFI deadline to or before submission closing |
| Mobilization is after substantial completion | Correct the project schedule |
| Ready to Publish cannot be selected | Resolve every required publication blocker first |
| API rejects Ready to Publish | Reconfirm the final acknowledgement and retry the same RFQ |
| Supporting documents are not attached yet | Publish only if the required creation baseline is otherwise complete, then manage documents from the RFQ workspace |
| Replacement RFQ is rejected | Verify the predecessor and governed reissue lineage rather than creating an unrelated duplicate |

For unresolved creation or authorization issues, use the **Support** link in the application footer or the Nexus Pavilion Inc. corporate contact channel.

## 15. Governance boundary

Publishing an RFQ creates the issuer's procurement container. It does not:

- invite every company automatically;
- grant a Company Workspace member respondent access to unrelated RFQs;
- expose commercial content before opening;
- bypass deadlines or authorization;
- make the award automatically; or
- convert an RFQ Invitation into Company Workspace membership.

Workspace Membership, RFQ Invitation, Quotation, and Contract Award remain distinct business domains with their own authorization and lifecycle controls.
