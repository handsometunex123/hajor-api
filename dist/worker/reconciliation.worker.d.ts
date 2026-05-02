import 'reflect-metadata';
declare function reconcilePaystack(): Promise<{
    checked: number;
    missing: number;
    mismatched: number;
    autoFixed: number;
}>;
export default reconcilePaystack;
