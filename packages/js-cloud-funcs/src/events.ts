import { createEvent } from './util/event'

export type ModelBeforeCreateEvent = {}
const [onModelBeforeCreate, fireModelBeforeCreate] =
  createEvent<ModelBeforeCreateEvent>(`OnModelBeforeCreate`)
export { onModelBeforeCreate, fireModelBeforeCreate }
export { onModelAfterCreate, fireModelAfterCreate }
export { onModelBeforeUpdate, fireModelBeforeUpdate }
export { onModelAfterUpdate, fireModelAfterUpdate }
export { onModelBeforeDelete, fireModelBeforeDelete }
export { onModelAfterDelete, fireModelAfterDelete }
export {
  onMailerBeforeAdminResetPasswordSend,
  fireMailerBeforeAdminResetPasswordSend,
}
export {
  onMailerAfterAdminResetPasswordSend,
  fireMailerAfterAdminResetPasswordSend,
}
export {
  onMailerBeforeUserResetPasswordSend,
  fireMailerBeforeUserResetPasswordSend,
}
export {
  onMailerAfterUserResetPasswordSend,
  fireMailerAfterUserResetPasswordSend,
}
export {
  onMailerBeforeUserVerificationSend,
  fireMailerBeforeUserVerificationSend,
}
export {
  onMailerAfterUserVerificationSend,
  fireMailerAfterUserVerificationSend,
}
export {
  onMailerBeforeUserChangeEmailSend,
  fireMailerBeforeUserChangeEmailSend,
}
export { onMailerAfterUserChangeEmailSend, fireMailerAfterUserChangeEmailSend }
export { onRealtimeConnectRequest, fireRealtimeConnectRequest }
export { onRealtimeBeforeSubscribeRequest, fireRealtimeBeforeSubscribeRequest }
export { onRealtimeAfterSubscribeRequest, fireRealtimeAfterSubscribeRequest }
export { onSettingsListRequest, fireSettingsListRequest }
export { onSettingsBeforeUpdateRequest, fireSettingsBeforeUpdateRequest }
export { onSettingsAfterUpdateRequest, fireSettingsAfterUpdateRequest }
export { onFileDownloadRequest, fireFileDownloadRequest }
export { onAdminsListRequest, fireAdminsListRequest }
export { onAdminViewRequest, fireAdminViewRequest }
export { onAdminBeforeCreateRequest, fireAdminBeforeCreateRequest }
export { onAdminAfterCreateRequest, fireAdminAfterCreateRequest }
export { onAdminBeforeUpdateRequest, fireAdminBeforeUpdateRequest }
export { onAdminAfterUpdateRequest, fireAdminAfterUpdateRequest }
export { onAdminBeforeDeleteRequest, fireAdminBeforeDeleteRequest }
export { onAdminAfterDeleteRequest, fireAdminAfterDeleteRequest }
export { onAdminAuthRequest, fireAdminAuthRequest }
export { onUsersListRequest, fireUsersListRequest }
export { onUserViewRequest, fireUserViewRequest }
export { onUserBeforeCreateRequest, fireUserBeforeCreateRequest }
export { onUserAfterCreateRequest, fireUserAfterCreateRequest }
export { onUserBeforeUpdateRequest, fireUserBeforeUpdateRequest }
export { onUserAfterUpdateRequest, fireUserAfterUpdateRequest }
export { onUserBeforeDeleteRequest, fireUserBeforeDeleteRequest }
export { onUserAfterDeleteRequest, fireUserAfterDeleteRequest }
export { onUserAuthRequest, fireUserAuthRequest }
export { onUserListExternalAuths, fireUserListExternalAuths }
export {
  onUserBeforeUnlinkExternalAuthRequest,
  fireUserBeforeUnlinkExternalAuthRequest,
}
export {
  onUserAfterUnlinkExternalAuthRequest,
  fireUserAfterUnlinkExternalAuthRequest,
}
export { onRecordsListRequest, fireRecordsListRequest }
export { onRecordViewRequest, fireRecordViewRequest }
export { onRecordBeforeCreateRequest, fireRecordBeforeCreateRequest }
export { onRecordAfterCreateRequest, fireRecordAfterCreateRequest }
export { onRecordBeforeUpdateRequest, fireRecordBeforeUpdateRequest }
export { onRecordAfterUpdateRequest, fireRecordAfterUpdateRequest }
export { onRecordBeforeDeleteRequest, fireRecordBeforeDeleteRequest }
export { onRecordAfterDeleteRequest, fireRecordAfterDeleteRequest }
export { onCollectionsListRequest, fireCollectionsListRequest }
export { onCollectionViewRequest, fireCollectionViewRequest }
export { onCollectionBeforeCreateRequest, fireCollectionBeforeCreateRequest }
export { onCollectionAfterCreateRequest, fireCollectionAfterCreateRequest }
export { onCollectionBeforeUpdateRequest, fireCollectionBeforeUpdateRequest }
export { onCollectionAfterUpdateRequest, fireCollectionAfterUpdateRequest }
export { onCollectionBeforeDeleteRequest, fireCollectionBeforeDeleteRequest }
export { onCollectionAfterDeleteRequest, fireCollectionAfterDeleteRequest }
export { onCollectionsBeforeImportRequest, fireCollectionsBeforeImportRequest }
export { onCollectionsAfterImportRequest, fireCollectionsAfterImportRequest }
export { onBeforeServe, fireBeforeServe }

// OnModelAfterCreate hook is triggered after successfully
// inserting a new entry in the DB.
export type ModelAfterCreateEvent = {}
const [onModelAfterCreate, fireModelAfterCreate] =
  createEvent<ModelAfterCreateEvent>(`OnModelAfterCreate`)

// OnModelBeforeUpdate hook is triggered before updating existing
// entry in the DB, allowing you to modify or validate the stored data.
export type ModelBeforeUpdateEvent = {}
const [onModelBeforeUpdate, fireModelBeforeUpdate] =
  createEvent<ModelBeforeUpdateEvent>(`OnModelBeforeUpdate`)

// OnModelAfterUpdate hook is triggered after successfully updating
// existing entry in the DB.
export type ModelAfterUpdateEvent = {}
const [onModelAfterUpdate, fireModelAfterUpdate] =
  createEvent<ModelAfterUpdateEvent>(`OnModelAfterUpdate`)

// OnModelBeforeDelete hook is triggered before deleting an
// existing entry from the DB.
export type ModelBeforeDeleteEvent = {}
const [onModelBeforeDelete, fireModelBeforeDelete] =
  createEvent<ModelBeforeDeleteEvent>(`OnModelBeforeDelete`)

// OnModelAfterDelete is triggered after successfully deleting an
// existing entry from the DB.
export type ModelAfterDeleteEvent = {}
const [onModelAfterDelete, fireModelAfterDelete] =
  createEvent<ModelAfterDeleteEvent>(`OnModelAfterDelete`)

// ---------------------------------------------------------------
// Mailer event hooks
// ---------------------------------------------------------------

// OnMailerBeforeAdminResetPasswordSend hook is triggered right before
// sending a password reset email to an admin.
//
// Could be used to send your own custom email template if
// [hook.StopPropagation] is returned in one of its listeners.
export type MailerBeforeAdminResetPasswordSendEvent = {}
const [
  onMailerBeforeAdminResetPasswordSend,
  fireMailerBeforeAdminResetPasswordSend,
] = createEvent<MailerBeforeAdminResetPasswordSendEvent>(
  `OnMailerBeforeAdminResetPasswordSend`
)

// OnMailerAfterAdminResetPasswordSend hook is triggered after
// admin password reset email was successfully sent.
export type MailerAfterAdminResetPasswordSendEvent = {}
const [
  onMailerAfterAdminResetPasswordSend,
  fireMailerAfterAdminResetPasswordSend,
] = createEvent<MailerAfterAdminResetPasswordSendEvent>(
  `OnMailerBeforeAdminResetPasswordSend`
)

// OnMailerBeforeUserResetPasswordSend hook is triggered right before
// sending a password reset email to a user.
//
// Could be used to send your own custom email template if
// [hook.StopPropagation] is returned in one of its listeners.
export type MailerBeforeUserResetPasswordSendEvent = {}
const [
  onMailerBeforeUserResetPasswordSend,
  fireMailerBeforeUserResetPasswordSend,
] = createEvent<MailerBeforeUserResetPasswordSendEvent>(
  `OnMailerBeforeUserResetPasswordSend`
)

// OnMailerAfterUserResetPasswordSend hook is triggered after
// a user password reset email was successfully sent.
export type MailerAfterUserResetPasswordSendEvent = {}
const [
  onMailerAfterUserResetPasswordSend,
  fireMailerAfterUserResetPasswordSend,
] = createEvent<MailerAfterUserResetPasswordSendEvent>(
  `OnMailerAfterUserResetPasswordSend`
)

// OnMailerBeforeUserVerificationSend hook is triggered right before
// sending a verification email to a user.
//
// Could be used to send your own custom email template if
// [hook.StopPropagation] is returned in one of its listeners.
export type MailerBeforeUserVerificationSendEvent = {}
const [
  onMailerBeforeUserVerificationSend,
  fireMailerBeforeUserVerificationSend,
] = createEvent<MailerBeforeUserVerificationSendEvent>(
  `OnMailerBeforeUserVerificationSend`
)

// OnMailerAfterUserVerificationSend hook is triggered after a user
// verification email was successfully sent.
export type MailerAfterUserVerificationSendEvent = {}
const [onMailerAfterUserVerificationSend, fireMailerAfterUserVerificationSend] =
  createEvent<MailerAfterUserVerificationSendEvent>(
    `OnMailerAfterUserVerificationSend`
  )

// OnMailerBeforeUserChangeEmailSend hook is triggered right before
// sending a confirmation new address email to a a user.
//
// Could be used to send your own custom email template if
// [hook.StopPropagation] is returned in one of its listeners.
export type MailerBeforeUserChangeEmailSendEvent = {}
const [onMailerBeforeUserChangeEmailSend, fireMailerBeforeUserChangeEmailSend] =
  createEvent<MailerBeforeUserChangeEmailSendEvent>(
    `OnMailerBeforeUserChangeEmailSend`
  )

// OnMailerAfterUserChangeEmailSend hook is triggered after a user
// change address email was successfully sent.
export type MailerAfterUserChangeEmailSendEvent = {}
const [onMailerAfterUserChangeEmailSend, fireMailerAfterUserChangeEmailSend] =
  createEvent<MailerAfterUserChangeEmailSendEvent>(
    `OnMailerAfterUserChangeEmailSend`
  )

// ---------------------------------------------------------------
// Realtime API event hooks
// ---------------------------------------------------------------

// OnRealtimeConnectRequest hook is triggered right before establishing
// the SSE client connection.
export type RealtimeConnectRequestEvent = {}
const [onRealtimeConnectRequest, fireRealtimeConnectRequest] =
  createEvent<RealtimeConnectRequestEvent>(`OnRealtimeConnectRequest`)

// OnRealtimeBeforeSubscribeRequest hook is triggered before changing
// the client subscriptions, allowing you to further validate and
// modify the submitted change.
export type RealtimeBeforeSubscribeRequestEvent = {}
const [onRealtimeBeforeSubscribeRequest, fireRealtimeBeforeSubscribeRequest] =
  createEvent<RealtimeBeforeSubscribeRequestEvent>(
    `OnRealtimeBeforeSubscribeRequest`
  )

// OnRealtimeAfterSubscribeRequest hook is triggered after the client
// subscriptions were successfully changed.
export type RealtimeAfterSubscribeRequestEvent = {}
const [onRealtimeAfterSubscribeRequest, fireRealtimeAfterSubscribeRequest] =
  createEvent<RealtimeAfterSubscribeRequestEvent>(
    `OnRealtimeAfterSubscribeRequest`
  )

// ---------------------------------------------------------------
// Settings API event hooks
// ---------------------------------------------------------------

// OnSettingsListRequest hook is triggered on each successful
// API Settings list request.
//
// Could be used to validate or modify the response before
// returning it to the client.
export type SettingsListRequestEvent = {}
const [onSettingsListRequest, fireSettingsListRequest] =
  createEvent<SettingsListRequestEvent>(`OnSettingsListRequest`)

// OnSettingsBeforeUpdateRequest hook is triggered before each API
// Settings update request (after request data load and before settings persistence).
//
// Could be used to additionally validate the request data or
// implement completely different persistence behavior
// (returning [hook.StopPropagation]).
export type SettingsBeforeUpdateRequestEvent = {}
const [onSettingsBeforeUpdateRequest, fireSettingsBeforeUpdateRequest] =
  createEvent<SettingsBeforeUpdateRequestEvent>(`OnSettingsBeforeUpdateRequest`)

// OnSettingsAfterUpdateRequest hook is triggered after each
// successful API Settings update request.
export type SettingsAfterUpdateRequestEvent = {}
const [onSettingsAfterUpdateRequest, fireSettingsAfterUpdateRequest] =
  createEvent<SettingsAfterUpdateRequestEvent>(`OnSettingsAfterUpdateRequest`)

// ---------------------------------------------------------------
// File API event hooks
// ---------------------------------------------------------------

// OnFileDownloadRequest hook is triggered before each API File download request.
//
// Could be used to validate or modify the file response before
// returning it to the client.
export type FileDownloadRequestEvent = {}
const [onFileDownloadRequest, fireFileDownloadRequest] =
  createEvent<FileDownloadRequestEvent>(`OnFileDownloadRequest`)

// ---------------------------------------------------------------
// Admin API event hooks
// ---------------------------------------------------------------

// OnAdminsListRequest hook is triggered on each API Admins list request.
//
// Could be used to validate or modify the response before returning it to the client.
export type AdminsListRequestEvent = {}
const [onAdminsListRequest, fireAdminsListRequest] =
  createEvent<AdminsListRequestEvent>(`OnAdminsListRequest`)

// OnAdminViewRequest hook is triggered on each API Admin view request.
//
// Could be used to validate or modify the response before returning it to the client.
export type AdminViewRequestEvent = {}
const [onAdminViewRequest, fireAdminViewRequest] =
  createEvent<AdminViewRequestEvent>(`OnAdminViewRequest`)

// OnAdminBeforeCreateRequest hook is triggered before each API
// Admin create request (after request data load and before model persistence).
//
// Could be used to additionally validate the request data or implement
// completely different persistence behavior (returning [hook.StopPropagation]).
export type AdminBeforeCreateRequestEvent = {}
const [onAdminBeforeCreateRequest, fireAdminBeforeCreateRequest] =
  createEvent<AdminBeforeCreateRequestEvent>(`OnAdminBeforeCreateRequest`)

// OnAdminAfterCreateRequest hook is triggered after each
// successful API Admin create request.
export type AdminAfterCreateRequestEvent = {}
const [onAdminAfterCreateRequest, fireAdminAfterCreateRequest] =
  createEvent<AdminAfterCreateRequestEvent>(`OnAdminAfterCreateRequest`)

// OnAdminBeforeUpdateRequest hook is triggered before each API
// Admin update request (after request data load and before model persistence).
//
// Could be used to additionally validate the request data or implement
// completely different persistence behavior (returning [hook.StopPropagation]).
export type AdminBeforeUpdateRequestEvent = {}
const [onAdminBeforeUpdateRequest, fireAdminBeforeUpdateRequest] =
  createEvent<AdminBeforeUpdateRequestEvent>(`OnAdminBeforeUpdateRequest`)

// OnAdminAfterUpdateRequest hook is triggered after each
// successful API Admin update request.
export type AdminAfterUpdateRequestEvent = {}
const [onAdminAfterUpdateRequest, fireAdminAfterUpdateRequest] =
  createEvent<AdminAfterUpdateRequestEvent>(`OnAdminAfterUpdateRequest`)

// OnAdminBeforeDeleteRequest hook is triggered before each API
// Admin delete request (after model load and before actual deletion).
//
// Could be used to additionally validate the request data or implement
// completely different delete behavior (returning [hook.StopPropagation]).
export type AdminBeforeDeleteRequestEvent = {}
const [onAdminBeforeDeleteRequest, fireAdminBeforeDeleteRequest] =
  createEvent<AdminBeforeDeleteRequestEvent>(`OnAdminBeforeDeleteRequest`)

// OnAdminAfterDeleteRequest hook is triggered after each
// successful API Admin delete request.
export type AdminAfterDeleteRequestEvent = {}
const [onAdminAfterDeleteRequest, fireAdminAfterDeleteRequest] =
  createEvent<AdminAfterDeleteRequestEvent>(`OnAdminAfterDeleteRequest`)

// OnAdminAuthRequest hook is triggered on each successful API Admin
// authentication request (sign-in, token refresh, etc.).
//
// Could be used to additionally validate or modify the
// authenticated admin data and token.
export type AdminAuthRequestEvent = {}
const [onAdminAuthRequest, fireAdminAuthRequest] =
  createEvent<AdminAuthRequestEvent>(`OnAdminAuthRequest`)

// ---------------------------------------------------------------
// User API event hooks
// ---------------------------------------------------------------

// OnUsersListRequest hook is triggered on each API Users list request.
//
// Could be used to validate or modify the response before returning it to the client.
export type UsersListRequestEvent = {}
const [onUsersListRequest, fireUsersListRequest] =
  createEvent<UsersListRequestEvent>(`OnUsersListRequest`)

// OnUserViewRequest hook is triggered on each API User view request.
//
// Could be used to validate or modify the response before returning it to the client.
export type UserViewRequestEvent = {}
const [onUserViewRequest, fireUserViewRequest] =
  createEvent<UserViewRequestEvent>(`OnUserViewRequest`)

// OnUserBeforeCreateRequest hook is triggered before each API User
// create request (after request data load and before model persistence).
//
// Could be used to additionally validate the request data or implement
// completely different persistence behavior (returning [hook.StopPropagation]).
export type UserBeforeCreateRequestEvent = {}
const [onUserBeforeCreateRequest, fireUserBeforeCreateRequest] =
  createEvent<UserBeforeCreateRequestEvent>(`OnUserBeforeCreateRequest`)

// OnUserAfterCreateRequest hook is triggered after each
// successful API User create request.
export type UserAfterCreateRequestEvent = {}
const [onUserAfterCreateRequest, fireUserAfterCreateRequest] =
  createEvent<UserAfterCreateRequestEvent>(`OnUserAfterCreateRequest`)

// OnUserBeforeUpdateRequest hook is triggered before each API User
// update request (after request data load and before model persistence).
//
// Could be used to additionally validate the request data or implement
// completely different persistence behavior (returning [hook.StopPropagation]).
export type UserBeforeUpdateRequestEvent = {}
const [onUserBeforeUpdateRequest, fireUserBeforeUpdateRequest] =
  createEvent<UserBeforeUpdateRequestEvent>(`OnUserBeforeUpdateRequest`)

// OnUserAfterUpdateRequest hook is triggered after each
// successful API User update request.
export type UserAfterUpdateRequestEvent = {}
const [onUserAfterUpdateRequest, fireUserAfterUpdateRequest] =
  createEvent<UserAfterUpdateRequestEvent>(`OnUserAfterUpdateRequest`)

// OnUserBeforeDeleteRequest hook is triggered before each API User
// delete request (after model load and before actual deletion).
//
// Could be used to additionally validate the request data or implement
// completely different delete behavior (returning [hook.StopPropagation]).
export type UserBeforeDeleteRequestEvent = {}
const [onUserBeforeDeleteRequest, fireUserBeforeDeleteRequest] =
  createEvent<UserBeforeDeleteRequestEvent>(`OnUserBeforeDeleteRequest`)

// OnUserAfterDeleteRequest hook is triggered after each
// successful API User delete request.
export type UserAfterDeleteRequestEvent = {}
const [onUserAfterDeleteRequest, fireUserAfterDeleteRequest] =
  createEvent<UserAfterDeleteRequestEvent>(`OnUserAfterDeleteRequest`)

// OnUserAuthRequest hook is triggered on each successful API User
// authentication request (sign-in, token refresh, etc.).
//
// Could be used to additionally validate or modify the
// authenticated user data and token.
export type UserAuthRequestEvent = {}
const [onUserAuthRequest, fireUserAuthRequest] =
  createEvent<UserAuthRequestEvent>(`OnUserAuthRequest`)

// OnUserListExternalAuths hook is triggered on each API user's external auths list request.
//
// Could be used to validate or modify the response before returning it to the client.
export type UserListExternalAuthsEvent = {}
const [onUserListExternalAuths, fireUserListExternalAuths] =
  createEvent<UserListExternalAuthsEvent>(`OnUserListExternalAuths`)

// OnUserBeforeUnlinkExternalAuthRequest hook is triggered before each API user's
// external auth unlink request (after models load and before the actual relation deletion).
//
// Could be used to additionally validate the request data or implement
// completely different delete behavior (returning [hook.StopPropagation]).
export type UserBeforeUnlinkExternalAuthRequestEvent = {}
const [
  onUserBeforeUnlinkExternalAuthRequest,
  fireUserBeforeUnlinkExternalAuthRequest,
] = createEvent<UserBeforeUnlinkExternalAuthRequestEvent>(
  `OnUserBeforeUnlinkExternalAuthRequest`
)

// OnUserAfterUnlinkExternalAuthRequest hook is triggered after each
// successful API user's external auth unlink request.
export type UserAfterUnlinkExternalAuthRequestEvent = {}
const [
  onUserAfterUnlinkExternalAuthRequest,
  fireUserAfterUnlinkExternalAuthRequest,
] = createEvent<UserAfterUnlinkExternalAuthRequestEvent>(
  `OnUserAfterUnlinkExternalAuthRequest`
)

// ---------------------------------------------------------------
// Record API event hooks
// ---------------------------------------------------------------

// OnRecordsListRequest hook is triggered on each API Records list request.
//
// Could be used to validate or modify the response before returning it to the client.
export type RecordsListRequestEvent = {}
const [onRecordsListRequest, fireRecordsListRequest] =
  createEvent<RecordsListRequestEvent>(`OnRecordsListRequest`)

// OnRecordViewRequest hook is triggered on each API Record view request.
//
// Could be used to validate or modify the response before returning it to the client.
export type RecordViewRequestEvent = {}
const [onRecordViewRequest, fireRecordViewRequest] =
  createEvent<RecordViewRequestEvent>(`OnRecordViewRequest`)

// OnRecordBeforeCreateRequest hook is triggered before each API Record
// create request (after request data load and before model persistence).
//
// Could be used to additionally validate the request data or implement
// completely different persistence behavior (returning [hook.StopPropagation]).
export type RecordBeforeCreateRequestEvent = {}
const [onRecordBeforeCreateRequest, fireRecordBeforeCreateRequest] =
  createEvent<RecordBeforeCreateRequestEvent>(`OnRecordBeforeCreateRequest`)

// OnRecordAfterCreateRequest hook is triggered after each
// successful API Record create request.
export type RecordAfterCreateRequestEvent = {}
const [onRecordAfterCreateRequest, fireRecordAfterCreateRequest] =
  createEvent<RecordAfterCreateRequestEvent>(`OnRecordAfterCreateRequest`)

// OnRecordBeforeUpdateRequest hook is triggered before each API Record
// update request (after request data load and before model persistence).
//
// Could be used to additionally validate the request data or implement
// completely different persistence behavior (returning [hook.StopPropagation]).
export type RecordBeforeUpdateRequestEvent = {}
const [onRecordBeforeUpdateRequest, fireRecordBeforeUpdateRequest] =
  createEvent<RecordBeforeUpdateRequestEvent>(`OnRecordBeforeUpdateRequest`)

// OnRecordAfterUpdateRequest hook is triggered after each
// successful API Record update request.
export type RecordAfterUpdateRequestEvent = {}
const [onRecordAfterUpdateRequest, fireRecordAfterUpdateRequest] =
  createEvent<RecordAfterUpdateRequestEvent>(`OnRecordAfterUpdateRequest`)

// OnRecordBeforeDeleteRequest hook is triggered before each API Record
// delete request (after model load and before actual deletion).
//
// Could be used to additionally validate the request data or implement
// completely different delete behavior (returning [hook.StopPropagation]).
export type RecordBeforeDeleteRequestEvent = {}
const [onRecordBeforeDeleteRequest, fireRecordBeforeDeleteRequest] =
  createEvent<RecordBeforeDeleteRequestEvent>(`OnRecordBeforeDeleteRequest`)

// OnRecordAfterDeleteRequest hook is triggered after each
// successful API Record delete request.
export type RecordAfterDeleteRequestEvent = {}
const [onRecordAfterDeleteRequest, fireRecordAfterDeleteRequest] =
  createEvent<RecordAfterDeleteRequestEvent>(`OnRecordAfterDeleteRequest`)

// ---------------------------------------------------------------
// Collection API event hooks
// ---------------------------------------------------------------

// OnCollectionsListRequest hook is triggered on each API Collections list request.
//
// Could be used to validate or modify the response before returning it to the client.
export type CollectionsListRequestEvent = {}
const [onCollectionsListRequest, fireCollectionsListRequest] =
  createEvent<CollectionsListRequestEvent>(`OnCollectionsListRequest`)

// OnCollectionViewRequest hook is triggered on each API Collection view request.
//
// Could be used to validate or modify the response before returning it to the client.
export type CollectionViewRequestEvent = {}
const [onCollectionViewRequest, fireCollectionViewRequest] =
  createEvent<CollectionViewRequestEvent>(`OnCollectionViewRequest`)

// OnCollectionBeforeCreateRequest hook is triggered before each API Collection
// create request (after request data load and before model persistence).
//
// Could be used to additionally validate the request data or implement
// completely different persistence behavior (returning [hook.StopPropagation]).
export type CollectionBeforeCreateRequestEvent = {}
const [onCollectionBeforeCreateRequest, fireCollectionBeforeCreateRequest] =
  createEvent<CollectionBeforeCreateRequestEvent>(
    `OnCollectionBeforeCreateRequest`
  )

// OnCollectionAfterCreateRequest hook is triggered after each
// successful API Collection create request.
export type CollectionAfterCreateRequestEvent = {}
const [onCollectionAfterCreateRequest, fireCollectionAfterCreateRequest] =
  createEvent<CollectionAfterCreateRequestEvent>(
    `OnCollectionAfterCreateRequest`
  )

// OnCollectionBeforeUpdateRequest hook is triggered before each API Collection
// update request (after request data load and before model persistence).
//
// Could be used to additionally validate the request data or implement
// completely different persistence behavior (returning [hook.StopPropagation]).
export type CollectionBeforeUpdateRequestEvent = {}
const [onCollectionBeforeUpdateRequest, fireCollectionBeforeUpdateRequest] =
  createEvent<CollectionBeforeUpdateRequestEvent>(
    `OnCollectionBeforeUpdateRequest`
  )

// OnCollectionAfterUpdateRequest hook is triggered after each
// successful API Collection update request.
export type CollectionAfterUpdateRequestEvent = {}
const [onCollectionAfterUpdateRequest, fireCollectionAfterUpdateRequest] =
  createEvent<CollectionAfterUpdateRequestEvent>(
    `OnCollectionAfterUpdateRequest`
  )

// OnCollectionBeforeDeleteRequest hook is triggered before each API
// Collection delete request (after model load and before actual deletion).
//
// Could be used to additionally validate the request data or implement
// completely different delete behavior (returning [hook.StopPropagation]).
export type CollectionBeforeDeleteRequestEvent = {}
const [onCollectionBeforeDeleteRequest, fireCollectionBeforeDeleteRequest] =
  createEvent<CollectionBeforeDeleteRequestEvent>(
    `OnCollectionBeforeDeleteRequest`
  )

// OnCollectionAfterDeleteRequest hook is triggered after each
// successful API Collection delete request.
export type CollectionAfterDeleteRequestEvent = {}
const [onCollectionAfterDeleteRequest, fireCollectionAfterDeleteRequest] =
  createEvent<CollectionAfterDeleteRequestEvent>(
    `OnCollectionAfterDeleteRequest`
  )

// OnCollectionsBeforeImportRequest hook is triggered before each API
// collections import request (after request data load and before the actual import).
//
// Could be used to additionally validate the imported collections or
// to implement completely different import behavior (returning [hook.StopPropagation]).
export type CollectionsBeforeImportRequestEvent = {}
const [onCollectionsBeforeImportRequest, fireCollectionsBeforeImportRequest] =
  createEvent<CollectionsBeforeImportRequestEvent>(
    `OnCollectionsBeforeImportRequest`
  )

// OnCollectionsAfterImportRequest hook is triggered after each
// successful API collections import request.
export type CollectionsAfterImportRequestEvent = {}
const [onCollectionsAfterImportRequest, fireCollectionsAfterImportRequest] =
  createEvent<CollectionsAfterImportRequestEvent>(
    `OnCollectionsAfterImportRequest`
  )

export type BeforeServeEvent = {}
const [onBeforeServe, fireBeforeServe] =
  createEvent<BeforeServeEvent>(`OnBeforeServe`)
