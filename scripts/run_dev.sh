#!/bin/bash
trap : SIGTERM SIGINT

echo $$

pip3 install -r requirements.txt
python3 server/main.py &
servpid=$!
npm i --prefix webapp
npm start --prefix webapp &
uipid=$!

wait $servpid
wait $uipid

if [[ $? -gt 128 ]]
then
    kill $servpid
    kill $uipid
fi
