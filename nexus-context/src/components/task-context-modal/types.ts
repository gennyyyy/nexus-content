export interface TaskContextForm {
    summary: string;
    what_changed: string;
    files_touched: string;
    decisions: string;
    open_questions: string;
    next_step: string;
}

export const EMPTY_TASK_CONTEXT_FORM: TaskContextForm = {
    summary: "",
    what_changed: "",
    files_touched: "",
    decisions: "",
    open_questions: "",
    next_step: "",
};
