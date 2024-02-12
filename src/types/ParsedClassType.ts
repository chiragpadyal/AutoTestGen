export interface LineData {
    line: string;
    status: string;
}

export interface ParsedMethodType {
        "method_name"?: string,
        "class"?: string,
        "source_code"?: string,
        "is_constructor"?: boolean,
        "star_line": number,
        "end_line": number,
        "coverage_lines"?: LineData[],
        "number_of_PC"?: number,
        "number_of_NC"?: number
}

export interface ParsedClassType {
    "class_name"?: string,
    "methods"?: ParsedMethodType[],
    "imports"?: string[],
    "class_path"?: string,
    "package"?: string,
    "project_name"?: string

}