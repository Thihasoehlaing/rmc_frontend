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
    /**
     * Old mock endpoints return an array of { rdig_guidelines_content }; the real
     * admin-settings guideline endpoint returns a single { content_html } object.
     */
    data?: Array<{ rdig_guidelines_content?: string }> | { content_html?: string };
}
