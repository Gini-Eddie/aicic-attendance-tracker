# Server keep-alive

The GitHub Actions workflow in `.github/workflows/keep-alive.yml` sends an
HTTPS GET request every ten minutes (at minutes 3, 13, 23, 33, 43, and 53
of each hour, UTC). It runs outside the backend, so it can wake a sleeping
server without depending on that server's own timers.

## Activate

1. Push the workflow to the GitHub repository's default branch.
2. Open **Settings → Secrets and variables → Actions → Variables**.
3. Add a repository variable named `HEALTHCHECK_URL` containing the full
   deployed backend health endpoint, for example
   `https://your-backend.onrender.com/api/health`.
4. Open **Actions → Server keep-alive → Run workflow** to test it.
5. Confirm the run succeeds. Future runs are scheduled automatically while
   the workflow is enabled.

Use the backend URL, even if the frontend is hosted elsewhere. The existing
FastAPI `/api/health` endpoint needs no account or token and does not query
the database. A successful ping confirms an HTTP response; it does not
verify database availability or keep a serverless database awake.

Requests have bounded timeouts and retries. HTTP errors fail the workflow,
and run history is available under Actions. To stop pings, disable the
workflow in Actions.

## Scheduling limits

GitHub scheduled runs may be delayed or dropped during high load. Public
repositories can have scheduled workflows disabled after 60 days without
repository activity. Actions usage limits also apply. See
[GitHub schedule documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

This is a best-effort keep-alive, not a guarantee of continuous uptime.
For a dedicated external cron service or an always-on machine, schedule
the following command with `*/10 * * * *`, replacing the example URL:

```sh
curl --fail --silent --show-error --connect-timeout 15 --max-time 90 https://your-backend.onrender.com/api/health
```

For Render free services, idle spin-down occurs after 15 minutes without
inbound traffic. Other free-tier limits and restarts still apply. See
[Render free service documentation](https://render.com/docs/free).
