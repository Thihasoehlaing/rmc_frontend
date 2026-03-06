export interface DropdownOption {
    value: any;
    label: string;
    disabled?: boolean;
}

export interface GuidelinesResponse {
    data?: Array<{
        rdig_guidelines_content?: string;
    }>;
}
