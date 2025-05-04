Next Steps and Implementation Plan
----------------------------------

Now that we have the core structure set up, here's what we should do next:

1.  **Run the initial setup and migrations**:

    bash

    ```
    npm run db:generate
    npm run db:migrate
    npm run dev
    ```

2.  **Complete the remaining pages**:
    -   Create a motorcycle detail page (`/app/garage/[id]/page.tsx`)
    -   Create add/edit motorcycle forms (`/app/garage/add/page.tsx` and `/app/garage/[id]/edit/page.tsx`)
    -   Create maintenance pages (`/app/maintenance/page.tsx`)
    -   Create service history pages (`/app/history/page.tsx`)
3.  **Implement authentication**:
    -   Consider using Next.js Auth.js or a similar authentication solution
4.  **Set up API routes**:
    -   Create API endpoints for CRUD operations on motorcycles, maintenance tasks, and records
5.  **Implement state management**:
    -   For a small app, React Context with hooks might be sufficient
    -   For more complex needs, consider libraries like Zustand or Redux
6.  **Build components**:
    -   Create reusable UI components like forms, modals, and buttons
    -   Implement proper form validation
7.  **Add data visualization**:
    -   Implement Chart.js for maintenance history and cost tracking

Extra:

- [ ] Prevent enumeration of attachments by generating a random, long value.
- [ ] Add webhook implementation for pushing notifications; e.g. also with Ntfy.
- [ ] Add PWA-support for mobile support.

Fix:

```Console Error

Cannot update a component (`Router`) while rendering a different component (`SettingsPage`). To locate the bad setState() call inside `SettingsPage`, follow the stack trace as described in https://react.dev/link/setstate-in-render

app/settings/page.tsx (76:12) @ SettingsPage


  74 |
  75 |   if (!session) {
> 76 |     router.push("/auth/signin");
     |            ^
  77 |     return null;
  78 |   }
  79 |
Call Stack
14

Show 13 ignore-listed frame(s)
SettingsPage
app/settings/page.tsx (76:12)
```` 