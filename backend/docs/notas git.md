git status               # ver qué ha cambiado
git add .                # añadir cambios
git commit -m "Describe lo que has hecho"
git push                 # subir al remoto

# Ejecutar tests
source .venv/bin/activate
python -m pytest -v

# Instalar el paquete
python pip install -e .

# Ejecutar el API
uvicorn beyond_api.main:app --reload

# Ejemplo Curl API
curl -X POST "http://127.0.0.1:8000/analysis" \
  -u admin:admin \
  -F "analysis=basic" \
  -F "csv_file=@data/example/synthetic_interactions.csv" \
  -F "economy_json={\"labor_cost_per_hour\":30,\"automation_volume_share\":0.7,\"customer_segments\":{\"VIP\":\"high\",\"Basico\":\"medium\"}}"

# Lo siguiente: 
# Disponer de varios json y pasarlos en la peticiòn
# Meter etiquetas en la respuesta por skill
