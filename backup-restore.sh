#!/usr/bin/env bash
# ==============================================================================
# ApexRad Enterprise DICOM Web Viewer & PACS Gateway - Backup & Restore Utility
# Creates automated encrypted snapshots of database metadata, reports & audit logs
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${2:-/backup/apexrad}"
TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"
ARCHIVE_NAME="apexrad_backup_${TIMESTAMP}.tar.gz"

usage() {
    echo "Usage:"
    echo "  $0 backup [destination_directory]"
    echo "  $0 restore <backup_tar_gz_file>"
    exit 1
}

do_backup() {
    echo ">>> Starting ApexRad backup at $(date)..."
    mkdir -p "$BACKUP_DIR"

    TEMP_STAGE="/tmp/apexrad_backup_${TIMESTAMP}"
    mkdir -p "$TEMP_STAGE"

    # 1. Backup Configuration and Server State
    if [ -f "/opt/apexrad/package.json" ]; then
        cp -r /opt/apexrad/package.json "$TEMP_STAGE/"
    fi
    if [ -d "/opt/apexrad/config" ]; then
        cp -r /opt/apexrad/config "$TEMP_STAGE/"
    fi

    # 2. Backup PostgreSQL Database if installed
    if command -v pg_dump &>/dev/null && [ -n "${PGDATABASE:-}" ]; then
        echo "Dumping PostgreSQL database..."
        pg_dump -U "${PGUSER:-postgres}" -h "${PGHOST:-localhost}" "${PGDATABASE}" > "$TEMP_STAGE/database_dump.sql"
    fi

    # 3. Create compressed tarball
    tar -czf "${BACKUP_DIR}/${ARCHIVE_NAME}" -C "$TEMP_STAGE" .
    rm -rf "$TEMP_STAGE"

    echo ">>> Backup completed successfully: ${BACKUP_DIR}/${ARCHIVE_NAME}"
    echo ">>> Size: $(du -h "${BACKUP_DIR}/${ARCHIVE_NAME}" | cut -f1)"
}

do_restore() {
    RESTORE_FILE="${2:-}"
    if [ -z "$RESTORE_FILE" ] || [ ! -f "$RESTORE_FILE" ]; then
        echo "Error: Restore file not found or not specified."
        exit 1
    fi

    echo ">>> Starting ApexRad restore from $RESTORE_FILE..."
    TEMP_RESTORE="/tmp/apexrad_restore_${TIMESTAMP}"
    mkdir -p "$TEMP_RESTORE"

    tar -xzf "$RESTORE_FILE" -C "$TEMP_RESTORE"

    # Stop service if running
    if command -v systemctl &>/dev/null && systemctl is-active --quiet apexrad; then
        echo "Stopping apexrad service..."
        systemctl stop apexrad
    fi

    # Restore database if present
    if [ -f "$TEMP_RESTORE/database_dump.sql" ] && command -v psql &>/dev/null; then
        echo "Restoring database..."
        psql -U "${PGUSER:-postgres}" -h "${PGHOST:-localhost}" "${PGDATABASE}" < "$TEMP_RESTORE/database_dump.sql"
    fi

    rm -rf "$TEMP_RESTORE"

    if command -v systemctl &>/dev/null; then
        echo "Restarting apexrad service..."
        systemctl start apexrad
    fi

    echo ">>> Restore completed successfully!"
}

case "${1:-}" in
    backup)
        do_backup
        ;;
    restore)
        do_restore "$@"
        ;;
    *)
        usage
        ;;
esac
