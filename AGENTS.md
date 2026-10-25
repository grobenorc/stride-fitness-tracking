<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep dashboard data mappings safe under strict indexed access: provide fallbacks for indexed lookups and use fixed tuples for paired numeric ranges so rendering never receives undefined.

- Keep the graph-led dashboard and account settings in separate components; calculate selected-period and sport summaries in the client-safe training module to share filtering consistently across charts and tables.
- Keep sample-level sport analytics in a client-safe analysis module and decode user-selected FIT recordings with a dynamically loaded Garmin SDK; recordings remain session-local until explicit account persistence is implemented.
- Calculate power curves only from contiguous measured one-second windows and classify environments from explicit activity subtypes; never infer zones, curves or indoor/outdoor setting from session averages or activity names.
