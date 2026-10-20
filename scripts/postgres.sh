#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG="/usr/lib/postgresql/17/bin"
DATA="$ROOT/.pgdata"
PORT=5434

if [ ! -x "$PG/pg_ctl" ]; then
  echo "PostgreSQL 17 was not found at $PG" >&2
  exit 1
fi

start() {
  if [ ! -d "$DATA" ]; then
    local pw
    pw="$(mktemp)"
    printf '%s' 'casingconnect' > "$pw"
    "$PG/initdb" -D "$DATA" --username=casingconnect --pwfile="$pw" --auth-local=trust --auth-host=scram-sha-256 --encoding=UTF8 --locale=C
    rm -f "$pw"
    printf "\nlisten_addresses = '127.0.0.1'\nport = %s\nunix_socket_directories = '/tmp'\n" "$PORT" >> "$DATA/postgresql.conf"
    "$PG/pg_ctl" -D "$DATA" -l "$DATA/server.log" -w start
    PGPASSWORD=casingconnect "$PG/psql" -h 127.0.0.1 -p "$PORT" -U casingconnect -d postgres -c "CREATE DATABASE casingconnect OWNER casingconnect;"
    return
  fi

  if "$PG/pg_ctl" -D "$DATA" status >/dev/null 2>&1; then
    echo "PostgreSQL is already running on port $PORT"
    return
  fi

  "$PG/pg_ctl" -D "$DATA" -l "$DATA/server.log" -w start
  echo "PostgreSQL is running on port $PORT"
}

stop() {
  if "$PG/pg_ctl" -D "$DATA" status >/dev/null 2>&1; then
    "$PG/pg_ctl" -D "$DATA" -w stop
  fi
  echo "PostgreSQL is stopped"
}

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
  *) echo "Usage: scripts/postgres.sh start|stop" >&2; exit 1 ;;
esac
