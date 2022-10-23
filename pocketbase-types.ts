// This file was @generated using pocketbase-typegen

export enum Collections {
	Instances = "instances",
	Profiles = "profiles",
}

export type InstancesRecord = {
	subdomain: string
	uid: string
	status?: string
	bin?: string
	fieldfooz?: string
	myJson?: null | unknown
}

export type ProfilesRecord = {
	userId: string
	name?: string
	avatar?: string
}

export type CollectionRecords = {
	instances: InstancesRecord
	profiles: ProfilesRecord
}