export enum AiSchemaType {
    ARRAY = 'array',
    OBJECT = 'object',
    STRING = 'string',
    NUMBER = 'number',
    INTEGER = 'integer',
    BOOLEAN = 'boolean'
}

export interface AiSchemaRequest {
    type: AiSchemaType;
    description?: string;
    nullable?: boolean;
    enum?: ReadonlyArray<string>;
    items?: AiSchemaRequest;
    properties?: Record<string, AiSchemaRequest>;
    required?: ReadonlyArray<string>;
}
