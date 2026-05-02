"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinAge = MinAge;
const class_validator_1 = require("class-validator");
function MinAge(minAge, validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'minAge',
            target: object.constructor,
            propertyName,
            constraints: [minAge],
            options: validationOptions,
            validator: {
                validate(value, args) {
                    if (!value)
                        return false;
                    const d = new Date(value);
                    if (Number.isNaN(d.getTime()))
                        return false;
                    const now = new Date();
                    const min = args.constraints[0];
                    let age = now.getFullYear() - d.getFullYear();
                    const m = now.getMonth() - d.getMonth();
                    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
                        age -= 1;
                    }
                    return age >= min;
                },
                defaultMessage(args) {
                    return `must be at least ${args.constraints[0]} years old`;
                },
            },
        });
    };
}
//# sourceMappingURL=min-age.decorator.js.map