function op2env {
    local filename="$1"

    local output
    output=$(op2env-print "$@")

    local line
    while IFS= read -r line; do
        local key="${line%%=*}"
        local value="${line#*=}"

        export "$key"="$value"
    done <<< "$output"
}
