/** Generic option type — use DropdownOption<string | number> for primitives or DropdownOption<MyObject> for objects. */
export interface DropdownOption<T = any> {
    value: T;
    label: string;
    description?: string;
    displayLabel?: string;
    searchText?: string;
    disabled?: boolean;
}

export interface GuidelinesResponse {
    data?: Array<{
        rdig_guidelines_content?: string;
    }>;
}
