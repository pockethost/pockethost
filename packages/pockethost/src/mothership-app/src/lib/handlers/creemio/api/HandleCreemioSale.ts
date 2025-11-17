import { mkLog } from '$util/Logger'
import { mkAudit } from '$util/mkAudit'
import { mkNotifier } from '$util/mkNotifier'
import { PartialDeep } from 'type-fest'

type SubscriptionEvent = PartialDeep<{
    raw: string
    body_hash: string
    xsignature_header: string
    secret: string;
    id: string;
    user_id: string
    product_id: string
    eventType: string; // "subscription.paid"
    created_at: number; // timestamp in ms
    object: SubscriptionObject;
}>

interface SubscriptionObject {
    id: string;
    object: "subscription";
    product: Product;
    customer: Customer;
    collection_method: "charge_automatically" | string;
    status: "active" | "canceled" | "past_due" | string;
    last_transaction_id: string;
    last_transaction_date: string; // ISO timestamp
    next_transaction_date: string; // ISO timestamp
    current_period_start_date: string; // ISO timestamp
    current_period_end_date: string; // ISO timestamp
    canceled_at: string | null;
    created_at: string; // ISO timestamp
    updated_at: string; // ISO timestamp
    metadata: Record<string, string>;
    mode: "local" | "live" | string;
}

interface Product {
    id: string;
    name: string;
    description: string;
    image_url: string | null;
    price: number;
    currency: string; // ISO 4217 currency code, e.g. "EUR"
    billing_type: "recurring" | "one_time" | string;
    billing_period: "every-month" | string;
    status: "active" | "inactive" | string;
    tax_mode: "exclusive" | "inclusive" | string;
    tax_category: string;
    default_success_url: string;
    created_at: string; // ISO timestamp
    updated_at: string; // ISO timestamp
    mode: "local" | "live" | string;
}

interface Customer {
    id: string;
    object: "customer";
    email: string;
    name: string;
    country: string;
    created_at: string; // ISO timestamp
    updated_at: string; // ISO timestamp
    mode: "local" | "live" | string;
}

interface Products {
    [key: string]: {
        interval: 'month' | 'year';
        quantity: number;
    };
}

export const HandleCreemioSale = (c: core.RequestEvent) => {

    const log = mkLog(`creemio`)
    const audit = mkAudit(log, $app)

    const context: SubscriptionEvent = {}

    try {
        context.secret = process.env.CM_WEBHOOK_SECRET  //need to add new ENV
        if (!context.secret) {
            throw new Error(`No secret`)
        }
        log(`Secret`, context.secret)

        context.raw = toString(c.request.body)


        context.body_hash = $security.hs256(context.raw, context.secret);
        log(`Body hash`, context.body_hash)

        context.xsignature_header = c.request.header.get('creem-signature')
        log(`Signature`, context.xsignature_header)

        if (context.xsignature_header == undefined || !$security.equal(context.body_hash, context.xsignature_header)) {
            throw new BadRequestError(`Invalid signature`)
        }
        log(`Signature verified`)

        context.object = JSON.parse(context.raw)
        log(`payload`, JSON.stringify(context.object, null, 2))

        context.user_id = context.object?.metadata?.user_id
        if (!context.user_id) {
            throw new Error(`No user ID`)
        } else {
            log(`user ID ok`, context.user_id)
        }

        context.product_id = context.object?.product?.id
        if (!context.product_id) {
            throw new Error(`No product ID`)
        } else {
            log(`product ID ok`, context.product_id)
        }

        const PRODUCTS: Products = {
            "prod_d1AY2Sadk9YAvLI0pj97f": {
                interval: 'month',
                quantity: 250
            },
            "prod_d1AY2Sadk9YAvLI2pj97f": {
                interval: 'year',
                quantity: 250
            }
        }

        const PRODUCT = PRODUCTS[context.product_id]

        if (!PRODUCT) {
            throw new Error(`Product not found: ${context.product_id}`)
        }

        const userRec = (() => {
            try {
                return $app.findFirstRecordByData('users', 'id', context.user_id)
            } catch (e) {
                throw new Error(`User ${context.user_id} not found`)
            }
        })()

        log(`user record ok`, userRec)

        const signup_canceller = () => {
            userRec.set(`subscription`, `free`)
            userRec.set(`subscription_quantity`, 0)
            userRec.set(`subscription_interval`, ``)
            $app.save(userRec)
            log(`saved user`)
            audit(`CREEMIO`, `Signup cancelled.`, context)
        }

        switch (context.eventType) {
            case "subscription.paid":
                userRec.set('subscription', 'premium')
                userRec.set('subscription_interval', PRODUCT.interval)
                userRec.set('subscription', PRODUCT.quantity)
                $app.save(userRec)
                log(`saved user`)

                const notify = mkNotifier(log, $app)

                notify(`lemonbot`, `lemon_order_discord`, context.user_id, context)
                log(`saved discord notice`)
                audit(`CREEMIO`, `Signup processed.`, context)
                break;
            case "subscription.canceled":
                signup_canceller()
                break;
            case "subscription.expired":
                signup_canceller()
                break;
        }


        return c.json(200, { status: 'ok' })


    } catch (e) {
        audit(`CREEMIO_ERR`, `${c}`, context)
        return c.json(500, { status: `error`, error: e.message })
    }

}