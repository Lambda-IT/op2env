function op2env
    set filename $argv[1]

    # Run op2env-print with all arguments and capture its output
    set output (op2env-print $argv)
    if test $status -ne 0
        return $status
    end

    # Split the output into lines
    set lines (string split "\n" $output)

    # Process each line
    for i in (seq (count $lines))
        set parts (string match -r '([^=]+)=(.*)' $lines[$i])
        set -gx $parts[2] $parts[3]
    end
end
