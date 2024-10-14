op2env() {
    filename="$1"

    output=$(op2env-print "$@")
    local status=$?
    if [ $status -ne 0 ]; then
        return $status
    fi

    lines=$(echo "$output" | tr '\n' ' ')

    while IFS= read -r line; do
        key="${line%%=*}"
        value="${line#*=}"

        if (( ${#key} > 0 )); then
            export "$key"="$value"
        fi

    done <<< "$output"
}
