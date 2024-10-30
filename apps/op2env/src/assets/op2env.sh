op2env() {
    local filename="$1"

    local output=$(op2env-print "$@")
    local status=$?
    if [ $status -ne 0 ]; then
        return $status
    fi

    local lines=$(echo "$output" | tr '\n' ' ')

    while IFS= read -r line; do
        local key="${line%%=*}"
        local value="${line#*=}"

        if (( ${#key} > 0 )); then
            export "$key"="$value"
        fi
    done <<< "$output"
}
