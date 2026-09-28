# Timestock-Inventory-Management-System
TIMESTOCK: STL DECOMPOSITION AND MOVING AVERAGES
FOR DEMAND AND STOCK MANAGEMENT IN MANUFACTURING
AND SERVICE INDUSTRIES

Proponents:
- Belandres, Venice P.
- Rapanan, Christian S.
- Quiñones, Ezekiel
- Duran, Ramon Cristopher 

## Run the web app in a browser

Use Node.js and Python 3.11. In PowerShell, from the repository root:

```powershell
npm install
npm --prefix frontend install
uv venv .venv --python 3.11
uv pip install --python .venv\Scripts\python.exe -r requirements.txt
npm --prefix frontend run build
```

If you have Python 3.11 and `pip` instead of `uv`, use these two commands in place of the `uv` commands:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

On macOS/Linux, create and install into `.venv` with `python3.11 -m venv .venv` and `.venv/bin/python -m pip install -r requirements.txt` instead.

### Run with Uvicorn

From the repository root, run these commands in the **same PowerShell terminal**:

```powershell
$env:PATH = "$((Resolve-Path -LiteralPath '.venv\Scripts').Path);$env:PATH"
$env:SESSION_SECRET = & .\.venv\Scripts\python.exe -c 'import secrets; print(secrets.token_hex(32))'
uvicorn backend.main:app --reload
```

Then open `http://127.0.0.1:8000/login` in your browser. The first line makes this project's `uvicorn` command available; the second provides the session secret required by the backend. These environment settings apply to that terminal only. Keep it open while using the app, and press Ctrl+C to stop it. Stop any other server using port 8000 before starting Uvicorn.

Alternatively, run `npm start` from the repository root to start the web server and open the browser automatically; it sets the session secret for that run.

If you run the backend with `run_backend.py`, set `SESSION_SECRET` in your terminal first, then run `.\.venv\Scripts\python.exe run_backend.py`.

To launch the Electron desktop version instead, use `npm run desktop`.
