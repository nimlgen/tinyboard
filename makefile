build:
	npm run build --prefix webapp

run:
	echo "Running tinyboard, port 6226"
	open http://127.0.0.1:6226/
	gunicorn --worker-class eventlet -w 1 --threads 8 'main:app' --chdir server -b :6226

dropdb:
	rm server/tinyboard.db

deps:
	pip3 install -r requirements.txt
	npm i --prefix webapp

dev:
	./scripts/run_dev.sh