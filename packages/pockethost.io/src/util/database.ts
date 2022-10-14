import ProvisioningStatus from '$components/ProvisioningStatus/ProvisioningStatus.svelte';
import { client } from '$src/pocketbase';
import { InstanceStatus } from '@pockethost/common';
import { forEach, keys, map, mapValues, values } from '@s-libs/micro-dash';
import { ClientResponseError } from 'pocketbase';
const { authViaEmail, createUser, user, createInstance } = client;
import {redirect} from "./redirect";


export type FormErrorHandler = (value:string)=>void

export const handleFormError = (error:any, setError?: FormErrorHandler)=>{
    console.error(`Form error: ${error}`,{error})
    const message = (()=>{
        if(!(error instanceof ClientResponseError)) return error.message
        if(error.data.message && keys(error.data.data).length===0) return error.data.message
        return map(error.data.data, info=>info.message).join('<br/>')
    })()
    if(setError) {
        setError(message);
    } else {
        throw error
    }
}

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
    setError?: FormErrorHandler,
    shouldRedirect: boolean = true,
) => {
    // Reset the form error if the form is submitted
    setError?.("");

    try {
        await authViaEmail(email, password);

        if(shouldRedirect) {
            redirect('/dashboard');
        }
    } catch(error: any) {
        handleFormError(error,setError)
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
    setError?: FormErrorHandler
) => {
    // Reset the form error if the form is submitted
    setError?.("");

    try {
        await createUser(email, password);
    } catch(error: any) {
        handleFormError(error,setError)
    }
}


export const handleCreateNewInstance = async(
    instanceName: string,
    setError?: FormErrorHandler
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
        handleFormError(error,setError)
    }
}


export const handleInstanceGeneratorWidget = async(
    email: string,
    password: string,
    instanceName: string,
    setError = (value: string) => {}
) => {
    try {
        // First create the new user
        await handleRegistration(email, password);

        // Then log them into the site, but don't trigger the redirect yet
        await handleLogin(email, password, undefined, false);

        // Now try to create the new instance
        await handleCreateNewInstance(instanceName);
    } catch (error:any) {
        handleFormError(error,setError)
    }
}