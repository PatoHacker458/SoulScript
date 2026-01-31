# Usamos Python ligero
FROM python:3.9-slim

# Instalamos dependencias del sistema necesarias para compilar fuentes y usar OpenCV
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Directorio de trabajo
WORKDIR /app

# Copiamos requirements e instalamos
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos el código
COPY . .

# Creamos carpetas necesarias
RUN mkdir -p build debug_imgs

# Exponemos el puerto
EXPOSE 8000

# Comando de arranque (Production Mode)
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]