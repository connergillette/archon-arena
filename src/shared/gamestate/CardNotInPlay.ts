import { KCard } from "../keyforge/card/KCard"

export interface CardNotInPlay {
    id: string
    ownerId: string
    backingCard: KCard
}
