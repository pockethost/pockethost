import ProvisioningStatus from '$components/ProvisioningStatus/ProvisioningStatus.svelte';
import { client } from '$src/pocketbase';
import { InstanceStatus } from '@pockethost/common';
const { authViaEmail, createUser, user, createInstance } = client;
import {redirect} from "./redirect";


/**
 * This will log a user into Pocketbase, and includes an optional error handler
 * @param email {string} The email of the user
 * @param password {string} The password of the user
 * @param setError {function} This can be used to show an alert bar if an error occurs during the login process
 * @param shouldRedirect {boolean} This will redirect the user to the dashboard when they are logged in
 */
export const handleLogin = async(
    email: string,
    password: string,
    setError = (value: string) => {},
    shouldRedirect: boolean = true,
) => {
    // Reset the form error if the form is submitted
    setError("");

    try {
        await authViaEmail(email, password);

        if(shouldRedirect) {
            redirect('/dashboard');
        }
    } catch(error: any) {
        setError(error.message);
        console.error(error)
    }
}


/**
 * This will register a new user into Pocketbase, and includes an optional error handler
 * @param email {string} The email of the user
 * @param password {string} The password of the user
 * @param setError {function} This can be used to show an alert bar if an error occurs during the login process
 */
export const handleRegistration = async(
    email: string,
    password: string,
    setError = (value: string) => {}
) => {
    // Reset the form error if the form is submitted
    setError("");

    try {
        await createUser(email, password);
    } catch(error: any) {
        setError(error.message);
        console.error(error)
    }
}


export const handleCreateNewInstance = async(
    instanceName: string,
    setError = (value: string) => {}
) => {
    // Get the newly created user id
    const { id } = user() || {};

    try {
        // Create a new instance using the generated name
        const record = await createInstance({
            subdomain: instanceName,
            uid: id,
            status: InstanceStatus.Idle
        })

        redirect(`/app/instances/${record.id}`)
    } catch (error: any) {
        setError(error.message);
        console.error(error)
    }
}


export const handleInstanceGeneratorWidget = async(
    email: string,
    password: string,
    instanceName: string,
    setError = (value: string) => {}
) => {
    // First create the new user
    await handleRegistration(email, password, setError);

    // Then log them into the site, but don't trigger the redirect yet
    await handleLogin(email, password, setError, false);

    // Now try to create the new instance
    await handleCreateNewInstance(instanceName, setError);
}