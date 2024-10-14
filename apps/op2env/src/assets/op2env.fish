function op2env
    set filename $argv[1]

    set output (op2env-print $argv)
    if test $status -ne 0
        return $status
    end

    set lines (string split "\n" $output)

    for i in (seq (count $lines))
        set parts (string split '=' $lines[$i])
        set -gx $parts[1] $parts[2]
    end
end
