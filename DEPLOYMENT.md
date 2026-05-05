# Deploy productivo temporal

URL objetivo: `http://187.127.1.112:8081/`

## 1. Archivos que se suben

Sube el proyecto completo, pero no subas estos directorios pesados o sensibles:

- `node_modules/`
- `.git/`
- `storage/rate-limit/`
- `storage/emails.log`

Mantén estos directorios en el servidor con permisos de escritura para el usuario de Apache/PHP:

- `storage/`
- `storage/rate-limit/`
- `uploads/`

## 2. Variables de entorno

En el servidor crea `.env` desde `.env.example` y cambia todos los valores `CHANGE_THIS...`.

Valores mínimos para el IP temporal:

```dotenv
AGENDATE_ENV=production
AGENDATE_APP_URL=http://187.127.1.112:8081
AGENDATE_ALLOWED_ORIGINS=http://187.127.1.112:8081
AGENDATE_DEV_SKIP_EMAIL_VERIFICATION=false
AGENDATE_DB_NAME=agendate
AGENDATE_DB_SOCKET=
AGENDATE_DB_HOST=127.0.0.1
AGENDATE_DB_PORT=3306
AGENDATE_DB_USER=agendate_app
AGENDATE_DB_PASS=CAMBIAR
AGENDATE_ALLOW_INIT=false
AGENDATE_INIT_TOKEN=CAMBIAR
VITE_BACKEND_ORIGIN=http://187.127.1.112:8081
```

No uses `root` ni contrasena vacia para MySQL en produccion. El backend ahora bloquea esa configuracion si `AGENDATE_ENV=production`.

## 3. Base de datos

Crea base y usuario antes de iniciar la app:

```sql
CREATE DATABASE agendate CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'agendate_app'@'localhost' IDENTIFIED BY 'CAMBIAR_PASSWORD_LARGO';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON agendate.* TO 'agendate_app'@'localhost';
FLUSH PRIVILEGES;
```

Despues del primer arranque, puedes reducir permisos quitando `CREATE` y `ALTER` si ya no necesitas migraciones automaticas.

## 4. Build frontend

En el servidor:

```bash
npm ci
npm run build
```

No uses `npm run dev` como produccion publica. Ese servidor es solo para desarrollo.

## 5. Apache en puerto 8081

Usa `deployment/apache-8081.conf` como base. Cambia `/var/www/agendate` por la ruta real.

La idea es:

- `DocumentRoot` apunta a `dist/`.
- `/api` apunta a `api/`.
- `/uploads` apunta a `uploads/`.
- `storage/`, `.env`, `src/`, `database/`, `deployment/` y archivos de configuracion quedan fuera del webroot publico.

Activa modulos necesarios:

```bash
a2enmod rewrite headers
```

Si usas `php-fpm`, configura tambien el handler PHP segun tu distro.

## 6. Inicializar admin

Por seguridad `api/init.php` queda bloqueado en produccion, salvo que actives temporalmente:

```dotenv
AGENDATE_ALLOW_INIT=true
AGENDATE_INIT_TOKEN=UN_TOKEN_LARGO_ALEATORIO
```

Ejecuta desde el servidor:

```bash
curl -H "X-Init-Token: UN_TOKEN_LARGO_ALEATORIO" http://127.0.0.1:8081/api/init.php
```

Cuando cree el admin, vuelve a dejar:

```dotenv
AGENDATE_ALLOW_INIT=false
```

## 7. Permisos

Ejemplo en Linux:

```bash
chown -R www-data:www-data storage uploads
find storage uploads -type d -exec chmod 775 {} \;
find uploads -type f -exec chmod 664 {} \;
```

## 8. Checklist de seguridad

- `.env` no debe ser accesible por navegador.
- `AGENDATE_ENV` debe ser `production`.
- `AGENDATE_DEV_SKIP_EMAIL_VERIFICATION` debe ser `false`.
- `AGENDATE_ALLOWED_ORIGINS` debe contener solo `http://187.127.1.112:8081` mientras no haya dominio.
- MySQL debe usar usuario dedicado, no `root`.
- `AGENDATE_ALLOW_INIT` debe quedar `false`.
- El firewall debe abrir solo lo necesario: `8081`, SSH y base de datos solo local.
- Cuando tengas dominio, cambia a HTTPS y actualiza `AGENDATE_APP_URL`/`AGENDATE_ALLOWED_ORIGINS`.

## Nota sobre HTTPS

Con IP y HTTP se puede publicar temporalmente, pero las sesiones y contrasenas viajan sin cifrado. La configuracion queda endurecida para el contexto actual, pero el cierre real de esa brecha es usar dominio con HTTPS.
