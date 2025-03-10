FROM python:3.13-slim

WORKDIR /app

COPY . /app

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 7001 8001

CMD ["uvicorn", "main:socket_app", "--host", "0.0.0.0", "--port", "7001"]