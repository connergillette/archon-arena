import Phaser from "phaser"

import amber from "../images/amber.png"
import cardPower from "../images/card-power.png"
import enhancedCardPower from "../images/enhanced-card-power.png"
import armor from "../images/armor.png"
import cardback from "../images/cardback.jpg"
import chains from "../images/chains.png"
import damage from "../images/damage.png"
import forgedKey from "../images/forgedkey.png"
import power from "../images/power.png"
import stun from "../images/stun.png"
import underConstruction from "../images/under-construction.png"
import unforgedKey from "../images/unforgedkey.png"
import greenCardGlow from "../images/green-card-glow.png"
import orangeCardGlow from "../images/orange-card-glow.png"

import Action from "../shared/Action"
import { CardInGame } from "../shared/gamestate/CardInGame"
import { Creature } from "../shared/gamestate/Creature"
import { GameState, PlayerState } from "../shared/gamestate/GameState"
import { GameEvent } from "./GameEvent"
import { getCardOwner, getCardType } from "./StateUtils"
import { preloadCardsInPhaser } from "./Utils"
import CardType from "./CardType"
import Card from "./Card"
import SmallCard from "./SmallCard"
import { cardScripts } from "../card-scripts/CardScripts"
import {
    CARD_HEIGHT,
    CARD_WIDTH,
    SMALL_CARD_WIDTH,
    SMALL_CARD_HEIGHT,
} from "./constants"
import ImageKey from "./ImageKey"

const {KeyCodes} = Phaser.Input.Keyboard

export const gameSceneHolder: { gameScene?: GameScene } = {
    gameScene: undefined
}

export enum PlayerPosition {
    TOP = "top",
    BOTTOM = "bottom"
}

class GameScene extends Phaser.Scene {
    state: GameState
    root: Phaser.GameObjects.Container | undefined
    cardHoverImage: Phaser.GameObjects.Image | undefined
    cardHoverManualIndicator: Phaser.GameObjects.Text | undefined
    creatureMousingOver: Phaser.GameObjects.GameObject | undefined
    artifactMousingOver: Phaser.GameObjects.GameObject | undefined
    cardInHandMousingOver: Phaser.GameObjects.GameObject | undefined
    modalContainer: Phaser.GameObjects.Container | undefined
    cameraControls: Phaser.Cameras.Controls.FixedKeyControl | undefined
    keysDown: {
        [key: string]: boolean
    }

    constructor(state: GameState, private playerId: string, private dispatch: (action: Action) => void, private width: number, private height: number) {
        super("GameScene")
        this.state = state
        this.keysDown = {}
        gameSceneHolder.gameScene = this
    }

    preload() {
        this.load.image(ImageKey.CARDBACK, cardback)
        this.load.image(ImageKey.UNFORGED_KEY, unforgedKey)
        this.load.image(ImageKey.FORGED_KEY, forgedKey)
        this.load.image(ImageKey.DAMAGE_TOKEN, damage)
        this.load.image(ImageKey.AMBER_TOKEN, amber)
        this.load.image(ImageKey.STUN_TOKEN, stun)
        this.load.image(ImageKey.ARMOR_TOKEN, armor)
        this.load.image(ImageKey.POWER_TOKEN, power)
        this.load.image(ImageKey.CHAINS, chains)
        this.load.image(ImageKey.DOOM_TOKEN, chains)
        this.load.image(ImageKey.UNDER_CONSTRUCTION, underConstruction)
        this.load.image(ImageKey.CARD_POWER, cardPower)
        this.load.image(ImageKey.ENHANCED_CARD_POWER, enhancedCardPower)
        this.load.image(ImageKey.GREEN_CARD_GLOW, greenCardGlow)
        this.load.image(ImageKey.ORANGE_CARD_GLOW, orangeCardGlow)

        const state = this.state
        const players = [state.playerOneState, state.playerTwoState]
        for (let i = 0; i < players.length; i++) {
            const player = players[i]
            preloadCardsInPhaser(this, player.hand)
            preloadCardsInPhaser(this, player.library)
            preloadCardsInPhaser(this, player.discard)
            preloadCardsInPhaser(this, player.archives)
            preloadCardsInPhaser(this, player.purged)
            preloadCardsInPhaser(this, player.artifacts)
            preloadCardsInPhaser(this, player.creatures)
            player.creatures.forEach((creature: Creature) => {
                preloadCardsInPhaser(this, creature.upgrades)
            })
        }
    }

    create() {
        this.render()
        this.setupKeyboardListeners()

        this.cameras.main.setBounds(0, 0, CARD_WIDTH * 20, this.height)
        const cursors = this.input.keyboard.createCursorKeys()
        this.cameraControls = new Phaser.Cameras.Controls.FixedKeyControl({
            camera: this.cameras.main,
            left: cursors.left,
            right: cursors.right,
            speed: 1,
        })
        this.input.keyboard.removeCapture("SPACE, SHIFT, UP, DOWN")
        this.input.keyboard.disableGlobalCapture()
        this.input.on("gameout", () => {
            this.input.keyboard.enabled = false
        })

        this.input.on("gameover", () => {
            this.input.keyboard.enabled = true
        })
    }

    update(time: number, delta: number) {
        this.cameraControls!.update(delta)
    }

    renderPlayerBoard(player: PlayerState, originX: number, originY: number, playerPosition: PlayerPosition) {
        const dispatch = this.dispatch

        const playerDataOffsetX = CARD_WIDTH * 8
        const playerNameY = playerPosition === PlayerPosition.TOP ? originY + CARD_HEIGHT * 0.7 : originY + CARD_HEIGHT * 0.15
        const playerNameText = new Phaser.GameObjects.Text(this, originX, playerNameY, player.player.name, {
            color: "#fff",
            stroke: "#000",
            strokeThickness: 4,
            fontSize: "16px"
        })
        this.root!.add(playerNameText)

        const amberImageY = playerPosition === PlayerPosition.TOP ? originY : originY + CARD_HEIGHT * 0.35
        const amberTextY = amberImageY + 25
        const chainImageY = playerPosition === PlayerPosition.TOP ? originY + 60 : originY + CARD_HEIGHT * 0.75
        const chainTextY = chainImageY + 15
        const keySize = 40
        const keyOffetY = playerPosition === PlayerPosition.TOP ? originY - 0 : originY + (CARD_HEIGHT - (keySize + 5) * 3)

        const amberImage = new Phaser.GameObjects.Image(this, originX + playerDataOffsetX + 5, amberImageY, "amber-token")
        amberImage.setDisplaySize(50, 50)
        amberImage.setOrigin(0)
        amberImage.setInteractive({cursor: "pointer"})
        amberImage.addListener("pointerup", (pointer: Phaser.Input.Pointer) => {
            dispatch({
                type: GameEvent.AlterPlayerAmber,
                amount: pointer.button === 2 ? -1 : 1,
                player: player.player
            })
            this.render()
        })
        this.root!.add(amberImage)

        const amberText = new Phaser.GameObjects.Text(this, originX + playerDataOffsetX + 30, amberTextY, player.amber.toString(), {
            color: "#fff",
            stroke: "#000",
            strokeThickness: 4,
            fontSize: "28px"
        })
        amberText.setOrigin(0.5)
        this.root!.add(amberText)

        const chainsImage = new Phaser.GameObjects.Image(this, originX + playerDataOffsetX + 15, chainImageY, ImageKey.CHAINS)
        chainsImage.setDisplaySize(30, 30)
        chainsImage.setOrigin(0)
        chainsImage.setInteractive({cursor: "pointer"})
        chainsImage.addListener("pointerup", (pointer: Phaser.Input.Pointer) => {
            dispatch({
                type: GameEvent.AlterPlayerChains,
                amount: pointer.button === 2 ? -1 : 1,
                player: player.player
            })
            this.render()
        })
        this.root!.add(chainsImage)

        const chainsText = new Phaser.GameObjects.Text(this, originX + playerDataOffsetX + 30, chainTextY, player.chains.toString(), {
            color: "#fff",
            stroke: "#000",
            strokeThickness: 4,
            fontSize: "18px"
        })
        chainsText.setOrigin(0.5)
        this.root!.add(chainsText)

        for (let i = 0; i < 3; i++) {
            const textureId = player.keys >= i + 1 ? ImageKey.FORGED_KEY : ImageKey.UNFORGED_KEY
            const keyImage = new Phaser.GameObjects.Image(this, originX + playerDataOffsetX - 45, keyOffetY + (keySize + 4) * i, textureId)
            keyImage.setDisplaySize(keySize, keySize)
            keyImage.setOrigin(0)
            keyImage.setInteractive({cursor: "pointer"})
            keyImage.addListener("pointerup", (pointer: Phaser.Input.Pointer) => {
                dispatch({
                    type: pointer.button === 2 ? GameEvent.UnForgeKey : GameEvent.ForgeKey,
                    player: player.player
                })
                this.render()
            })
            this.root!.add(keyImage)
        }

        const creatureOffsetY = playerPosition === PlayerPosition.TOP ? CARD_HEIGHT * 2.05 : -CARD_HEIGHT * 1.05
        const artifactOffsetY = playerPosition === PlayerPosition.TOP ? CARD_HEIGHT * 1.25 : -CARD_HEIGHT * 0.25
        const cardPileTextY = playerPosition === PlayerPosition.TOP ? originY : originY + CARD_HEIGHT * 0.30

        const artifactDropZoneX = originX + CARD_WIDTH * 0.35
        this.createCardDropZone({
            x: artifactDropZoneX,
            y: originY + artifactOffsetY,
            onDrop: (card: Card) => {
                console.log(card)
                const cardId = card.id
                if (getCardType(this.state, cardId) !== CardType.HAND)
                    return

                dispatch({
                    type: GameEvent.PlayArtifact,
                    player: player.player,
                    cardId,
                })
                this.render()
            }
        })

        const discardPileX = originX + CARD_WIDTH * 5.5
        const discardPileZone = this.createCardDropZone({
            x: discardPileX,
            y: playerPosition === PlayerPosition.TOP ? originY + CARD_HEIGHT * 0.35 : originY + CARD_HEIGHT * 0.65,
            allowCardTypes: [CardType.HAND, CardType.CREATURE, CardType.ARTIFACT, CardType.UPGRADE],
            getCardImage: () => player.discard.length === 0 ? ImageKey.CARDBACK : player.discard[player.discard.length - 1].backingCard.cardTitle,
            getMinimumAlpha: () => player.discard.length === 0 ? 0.1 : 1,
            onDrop: (card: Card) => {
                dispatch({
                    type: GameEvent.DiscardCard,
                    cardId: card.id,
                    player: player.player
                })
                this.render()
            }
        })
        discardPileZone.addListener("pointerup", (pointer: Phaser.Input.Pointer) => {
            if (pointer.button === 2) {
                this.openCardModal({
                    x: discardPileZone.x,
                    y: discardPileZone.y,
                    cards: player.discard,
                    playerPosition,
                    onClick: (card: CardInGame) => {
                        dispatch({
                            type: GameEvent.MoveCardFromDiscardToHand,
                            cardId: card.id,
                            player: player.player
                        })
                        this.render()
                    }
                })
            } else {
                if (pointer.event.shiftKey) {
                    dispatch({
                        type: GameEvent.ShuffleDiscardIntoDeck,
                        player: player.player,
                    })
                } else {
                    dispatch({
                        type: GameEvent.DrawFromDiscard,
                        player: player.player,
                    })
                }
                this.render()
            }
        })
        const discardPileText = new Phaser.GameObjects.Text(this, discardPileX - CARD_WIDTH * 0.35, cardPileTextY, `Discard (${player.discard.length})`, {
            color: "#000",
            backgroundColor: "rgba(255, 255, 255, 1)",
            fontSize: "10px",
        })
        this.root!.add(discardPileText)

        const drawPileX = originX + CARD_WIDTH * 5.5 + CARD_WIDTH * 0.8
        const drawPileZone = this.createCardDropZone({
            x: drawPileX,
            y: playerPosition === PlayerPosition.TOP ? originY + CARD_HEIGHT * 0.35 : originY + CARD_HEIGHT * 0.65,
            getMinimumAlpha: () => player.library.length === 0 ? 0.1 : 1,
            allowCardTypes: [CardType.HAND, CardType.CREATURE, CardType.ARTIFACT, CardType.UPGRADE],
            onDrop: (card: Card) => {
                dispatch({
                    type: GameEvent.PutCardOnDrawPile,
                    cardId: card.id,
                    player: player.player
                })
                this.render()
            },
        })
        drawPileZone.addListener("pointerup", (pointer: Phaser.Input.Pointer) => {
            if (pointer.button === 2) {
                this.openCardModal({
                    x: drawPileZone.x,
                    y: drawPileZone.y,
                    cards: player.library.reverse(),
                    playerPosition,
                    onClick: (card: CardInGame) => {
                        dispatch({
                            type: GameEvent.MoveCardFromDrawPileToHand,
                            cardId: card.id,
                            player: player.player
                        })
                        this.render()
                    }
                })
            } else {
                dispatch({
                    type: pointer.event.shiftKey ? GameEvent.ShuffleDeck : GameEvent.DrawCard,
                    player: player.player,
                })
                this.render()
            }
        })
        const drawPileText = new Phaser.GameObjects.Text(this, drawPileX - CARD_WIDTH * 0.35, cardPileTextY, `Draw (${player.library.length})`, {
            color: "#000",
            fontSize: "10px",
            backgroundColor: "rgba(255, 255, 255, 1)"
        })
        this.root!.add(drawPileText)

        const archivePileX = originX + CARD_WIDTH * 5.5 + CARD_WIDTH * 1.6
        const archivePileZone = this.createCardDropZone({
            x: archivePileX,
            y: playerPosition === PlayerPosition.TOP ? originY + CARD_HEIGHT * 0.35 : originY + CARD_HEIGHT * 0.65,
            getMinimumAlpha: () => player.archives.length === 0 ? 0.1 : 1,
            allowCardTypes: [CardType.HAND, CardType.CREATURE, CardType.ARTIFACT],
            onDrop: (card: Card) => {
                dispatch({
                    type: GameEvent.ArchiveCard,
                    cardId: card.id,
                    player: player.player
                })
                this.render()
            },
        })
        archivePileZone.addListener("pointerup", (pointer: Phaser.Input.Pointer) => {
            if (pointer.button === 2) {
                this.openCardModal({
                    x: archivePileZone.x,
                    y: archivePileZone.y,
                    cards: player.archives,
                    playerPosition,
                    onClick: (card: CardInGame) => {
                        dispatch({
                            type: GameEvent.MoveCardFromArchiveToHand,
                            cardId: card.id,
                            player: player.player
                        })
                        this.render()
                    }
                })
            } else {
                dispatch({
                    type: GameEvent.TakeArchive,
                    player: player.player,
                })
                this.render()
            }
        })
        const archivePileText = new Phaser.GameObjects.Text(this, archivePileX - CARD_WIDTH * 0.35, cardPileTextY, `Archive (${player.archives.length})`, {
            color: "#000",
            fontSize: "10px",
            backgroundColor: "rgba(255, 255, 255, 1)"
        })
        this.root!.add(archivePileText)

        const purgePileX = originX + playerDataOffsetX + CARD_WIDTH * 1
        const purgePileZone = this.createCardDropZone({
            x: purgePileX,
            y: playerPosition === PlayerPosition.TOP ? originY + CARD_HEIGHT * 0.35 : originY + CARD_HEIGHT * 0.65,
            getCardImage: () => player.purged.length === 0 ? ImageKey.CARDBACK : player.purged[player.purged.length - 1].backingCard.cardTitle,
            getMinimumAlpha: () => player.purged.length === 0 ? 0.1 : 1,
            allowCardTypes: [CardType.HAND, CardType.CREATURE, CardType.ARTIFACT, CardType.UPGRADE],
            onDrop: (card: Card) => {
                dispatch({
                    type: GameEvent.PurgeCard,
                    cardId: card.id,
                    player: player.player
                })
                this.render()
            },
        })
        purgePileZone.addListener("pointerup", () => {
            // Open purge modal
        })
        const purgePileText = new Phaser.GameObjects.Text(this, purgePileX - CARD_WIDTH * 0.35, cardPileTextY, `Purge (${player.purged.length})`, {
            color: "#000",
            fontSize: "10px",
            backgroundColor: "rgba(255, 255, 255, 1)"
        })
        this.root!.add(purgePileText)

        let artifactOffsetX = 0
        for (let i = 0; i < player.artifacts.length; i++) {
            const artifact = player.artifacts[i]

            if (i > 0) {
                const previousArtifact = player.artifacts[i - 1]
                artifactOffsetX += (SMALL_CARD_WIDTH * 0.1) * previousArtifact.cardsUnderneath.length
            }

            if (artifact.ready) {
                artifactOffsetX += SMALL_CARD_WIDTH * 0.1
                artifactOffsetX += (SMALL_CARD_WIDTH * 0.1) * (artifact.cardsUnderneath.length)
            }

            const card = new SmallCard({
                scene: this,
                x: originX + SMALL_CARD_WIDTH * 0.3 + SMALL_CARD_WIDTH * 1.05 * (i + 1) + artifactOffsetX,
                y: originY + artifactOffsetY,
                id: artifact.id,
                front: artifact.backingCard.cardTitle,
                back: ImageKey.CARDBACK,
                faceup: artifact.faceup,
                ready: artifact.ready,
                cardsUnderneath: artifact.cardsUnderneath,
                draggable: true,
                backingCard: artifact.backingCard,
                onClick: this.onClickArtifact.bind(this),
                onMouseOver: this.onMouseOverArtifact.bind(this),
                onMouseOut: this.onMouseOutArtifact.bind(this),
                onDragStart: this.onDragStart.bind(this),
            })
            Object.keys(artifact.tokens)
                .forEach(token => {
                    // @ts-ignore
                    const tokenAmount = artifact.tokens[token]
                    card.addToken({
                        type: token,
                        amount: tokenAmount,
                    })
                })
            this.root!.add(card)
        }

        let lastCreatureX = 0
        let creatureOffsetX = 0
        for (let i = 0; i < player.creatures.length; i++) {
            const creature = player.creatures[i]
            let creatureY = originY + creatureOffsetY
            if (creature.taunt) {
                creatureY += playerPosition === PlayerPosition.TOP ? 15 : -15
            }

            if (i > 0) {
                const previousCreature = player.creatures[i - 1]
                creatureOffsetX += SMALL_CARD_WIDTH * 0.1 * previousCreature.cardsUnderneath.length
                creatureOffsetX += SMALL_CARD_WIDTH * 0.1 * previousCreature.upgrades.length
            }

            if (creature.ready) {
                creatureOffsetX += SMALL_CARD_WIDTH * 0.1
                creatureOffsetX += SMALL_CARD_WIDTH * 0.1 * creature.cardsUnderneath.length
            }

            const creatureCard = new SmallCard({
                scene: this,
                x: originX + SMALL_CARD_WIDTH * 0.3 + SMALL_CARD_WIDTH * 1.05 * (i + 1) + creatureOffsetX,
                y: creatureY,
                id: creature.id,
                front: creature.backingCard.cardTitle,
                back: ImageKey.CARDBACK,
                faceup: creature.faceup,
                ready: creature.ready,
                cardsUnderneath: creature.cardsUnderneath,
                upgrades: creature.upgrades,
                draggable: true,
                backingCard: creature.backingCard,
                onClick: this.onClickCreature.bind(this),
                onMouseOver: this.onMouseOverCreature.bind(this),
                onMouseOut: this.onMouseOutCreature.bind(this),
                onMouseOverUpgrade: this.onMouseOverUpgrade.bind(this),
                onMouseOutUpgrade: this.onMouseOutUpgrade.bind(this),
                onDragStart: this.onDragStart.bind(this),
            })
            Object.keys(creature.tokens)
                .forEach(token => {
                    const tokenAmount = creature.tokens[token]
                    creatureCard.addToken({
                        type: token,
                        amount: tokenAmount,
                    })
                })
            lastCreatureX = creatureCard.x
            this.root!.add(creatureCard)

            const dropZoneX = creatureCard.x
            this.createCardDropZone({
                x: dropZoneX,
                y: originY + creatureOffsetY,
                visible: false,
                onDrop: (droppedCard: Card) => {
                    const droppedCardId = droppedCard.id
                    if (getCardType(this.state, droppedCardId) !== CardType.HAND)
                        return

                    dispatch({
                        type: GameEvent.PlayUpgrade,
                        upgradeId: droppedCard.id,
                        creatureId: creatureCard.id,
                        player: player.player
                    })
                    droppedCard.destroy()
                    this.render()
                }
            })
        }

        const handOffsetY = playerPosition === PlayerPosition.TOP ? -CARD_HEIGHT * 0.3 : CARD_HEIGHT * 0.3
        const handWidth = CARD_WIDTH * 4
        for (let i = 0; i < player.hand.length; i++) {
            const card = new Card({
                scene: this,
                x: originX + CARD_WIDTH / 2 + i * Math.min((handWidth / player.hand.length), CARD_WIDTH * 0.8),
                y: originY + CARD_HEIGHT / 2 + handOffsetY,
                id: player.hand[i].id,
                front: playerPosition === PlayerPosition.TOP ? ImageKey.CARDBACK : player.hand[i].backingCard.cardTitle,
                back: ImageKey.CARDBACK,
                faceup: playerPosition === PlayerPosition.BOTTOM,
                draggable: true,
                backingCard: player.hand[i].backingCard,
                onClick: this.onClickCardInHand.bind(this),
                onMouseOver: this.onMouseOverCardInHand.bind(this),
                onMouseOut: this.onMouseOutCardInHand.bind(this),
                onDragStart: this.onDragStart.bind(this),
                onDragEnd: this.onDragEndCardInHand.bind(this),
            })
            this.root!.add(card)
        }

        this.createCardDropZone({
            x: originX + CARD_WIDTH * 0.35,
            y: originY + creatureOffsetY,
            onDrop: (card: Card) => {
                const cardId = card.id
                if (getCardType(this.state, cardId) !== CardType.HAND)
                    return

                dispatch({
                    type: GameEvent.PlayCreature,
                    cardId: card.id,
                    player: player.player,
                    side: "left",
                })
                this.render()
            }
        })

        if (player.creatures.length) {
            const lastCreature = player.creatures[player.creatures.length - 1]
            let rightCreatureDropZoneX = lastCreatureX + SMALL_CARD_WIDTH + SMALL_CARD_WIDTH * 0.1 * lastCreature.upgrades.length
            if (lastCreature.ready) {
                rightCreatureDropZoneX += SMALL_CARD_WIDTH * 0.1
            }
            this.createCardDropZone({
                x: rightCreatureDropZoneX,
                y: originY + creatureOffsetY,
                onDrop: (card: Card) => {
                    const cardId = card.id
                    if (getCardType(this.state, cardId) !== CardType.HAND)
                        return

                    dispatch({
                        type: GameEvent.PlayCreature,
                        cardId: card.id,
                        player: player.player,
                        side: "right",
                    })
                    this.render()
                }
            })
        }

        const handDropZoneWidth = handWidth + 50
        const handDropZoneX = originX + handDropZoneWidth / 2
        const handDropZoneY = originY + CARD_HEIGHT / 2
        const handDropZone = new Phaser.GameObjects.Zone(this, handDropZoneX, handDropZoneY, handDropZoneWidth, CARD_HEIGHT)
        handDropZone.setRectangleDropZone(handDropZoneWidth, CARD_HEIGHT)
        handDropZone.setDataEnabled()
        // @ts-ignore
        handDropZone.data.set({
            onEnter: () => {},
            onLeave: () => {},
            onDrop: (card: Card) => {
                const cardType = getCardType(this.state, card.id)
                if (cardType === CardType.ARTIFACT) {
                    this.dispatch({
                        type: GameEvent.MoveArtifactToHand,
                        cardId: card.id,
                    })
                }
                if (cardType === CardType.CREATURE) {
                    dispatch({
                        type: GameEvent.MoveCreatureToHand,
                        cardId: card.id,
                    })
                }
                this.render()
            }
        })
        this.root!.add(handDropZone)
        this.root!.sendToBack(handDropZone)
    }

    render() {
        if (this.root) {
            this.root.list.forEach((obj: Phaser.GameObjects.GameObject) => obj.destroy())
            this.root.destroy()
        }
        this.root! = this.add.container(0, 0)

        let opponentState
        let ownState
        if (this.playerId === this.state.playerTwoState.player.id) {
            ownState = this.state.playerTwoState
            opponentState = this.state.playerOneState
        } else {
            ownState = this.state.playerOneState
            opponentState = this.state.playerTwoState
        }

        this.renderPlayerBoard(opponentState, 5, 0, PlayerPosition.TOP)
        this.renderPlayerBoard(ownState, 5, this.height - CARD_HEIGHT, PlayerPosition.BOTTOM)

        if (this.modalContainer) {
            this.modalContainer.destroy()
            delete this.modalContainer
        }
    }

    createCardDropZone(
        {
            x,
            y,
            onDrop,
            getCardImage = () => ImageKey.CARDBACK,
            getMinimumAlpha = () => 0.1,
            visible = true,
            allowCardTypes = [CardType.HAND],
        }: {
            x: number,
            y: number,
            onDrop: Function,
            getCardImage?: Function,
            getMinimumAlpha?: Function,
            visible?: boolean,
            allowCardTypes?: CardType[],
        }) {

        const width = CARD_WIDTH * 0.7
        const height = CARD_HEIGHT * 0.7
        const zone = new Phaser.GameObjects.Zone(this, x, y, width, height)
        const image = new Phaser.GameObjects.Image(this, zone.x, zone.y, getCardImage())
        image.setDisplaySize(width, height)

        zone.setRectangleDropZone(width, height)
        zone.setDataEnabled()
        // @ts-ignore
        zone.data.set({
            onEnter: (card: Card) => {
                const cardId = card.id
                const cardType = getCardType(this.state, cardId)
                if (allowCardTypes.includes(cardType)) {
                    image.setAlpha(1)
                }
            },
            onLeave: () => {
                image.setAlpha(getMinimumAlpha())
            },
            onDrop,
        })

        zone.data.get("onLeave")()
        this.root!.add(zone)
        if (visible) {
            this.root!.add(image)
            this.root!.sendToBack(image)
        }
        this.root!.sendToBack(zone)
        return zone
    }

    openCardModal(
        {
            x,
            y,
            cards,
            playerPosition,
            onClick,
        }: {
            x: number,
            y: number,
            cards: CardInGame[],
            playerPosition: PlayerPosition,
            onClick: Function,
        }) {
        if (this.modalContainer) {
            this.modalContainer.destroy()
            delete this.modalContainer
        } else {
            this.modalContainer = new Phaser.GameObjects.Container(this, 0, 0)
            for (let i = cards.length - 1; i >= 0; i--) {
                const card = cards[i]
                let cardOffsetY = (CARD_HEIGHT * 0.1) * i + CARD_HEIGHT + 10
                if (playerPosition === PlayerPosition.BOTTOM)
                    cardOffsetY = cardOffsetY * -1
                const image = new Phaser.GameObjects.Image(this, x, y + cardOffsetY, card.backingCard.cardTitle)
                image.setDisplaySize(CARD_WIDTH, CARD_HEIGHT)
                image.setInteractive()
                image.addListener("pointerup", () => {
                    onClick(card, i)
                })
                image.addListener("pointerover", () => {
                    this.showEnlargedCard(card.backingCard.cardTitle)
                })
                image.addListener("pointerout", () => {
                    if (this.cardHoverImage) {
                        this.cardHoverImage.destroy()
                        this.cardHoverManualIndicator!.destroy()
                    }
                })
                this.modalContainer.add(image)
            }
            this.root!.add(this.modalContainer)
        }
    }

    onMouseOverCreature(e: MouseEvent, target: Card) {
        const texture = target.front
        this.showEnlargedCard(texture)
        this.creatureMousingOver = target
    }

    onMouseOutCreature() {
        this.creatureMousingOver = undefined

        if (this.cardHoverImage) {
            this.cardHoverImage.destroy()
            this.cardHoverManualIndicator!.destroy()
        }
    }

    onClickCreature(e: MouseEvent, card: Card) {
        const dispatch = this.dispatch
        const cardId = card.id

        if (this.keysDown[KeyCodes.R]) {
            dispatch({
                type: GameEvent.MoveCreatureRight,
                cardId,
            })
            this.render()
            return
        }

        if (this.keysDown[KeyCodes.L]) {
            dispatch({
                type: GameEvent.MoveCreatureLeft,
                cardId,
            })
            this.render()
            return
        }

        if (this.keysDown[KeyCodes.B]) {
            dispatch({
                type: GameEvent.DiscardCard,
                cardId,
            })
            this.render()
            return
        }

        if (this.keysDown[KeyCodes.M]) {
            dispatch({
                type: GameEvent.MoveCreatureToHand,
                cardId,
            })
            this.render()
            return
        }

        if (this.keysDown[KeyCodes.S]) {
            dispatch({
                type: GameEvent.ToggleStun,
                cardId,
            })
            this.render()
            return
        }

        if (this.keysDown[KeyCodes.C]) {
            dispatch({
                type: GameEvent.CaptureAmber,
                cardId,
                amount: e.button === 2 ? -1 : 1
            })
            this.render()
            return
        }

        if (this.keysDown[KeyCodes.T]) {
            dispatch({
                type: GameEvent.ToggleTaunt,
                cardId,
            })
            this.render()
            return
        }

        if (this.keysDown[KeyCodes.P]) {
            dispatch({
                type: GameEvent.AlterCreaturePower,
                cardId,
                amount: e.button === 2 ? -1 : 1
            })
            this.render()
            return
        }

        if (this.keysDown[KeyCodes.D]) {
            dispatch({
                type: GameEvent.AlterCreatureDamage,
                cardId,
                amount: e.button === 2 ? -1 : 1
            })
            this.render()
            return
        }

        if (this.keysDown[KeyCodes.X]) {
            dispatch({
                type: GameEvent.ToggleDoomToken,
                cardId,
            })
            this.render()
            return
        }

        if (this.keysDown[KeyCodes.A]) {
            dispatch({
                type: GameEvent.AddAmberToCard,
                cardId,
                amount: e.button === 2 ? -1 : 1
            })
            this.render()
            return
        }

        dispatch({
            type: GameEvent.UseCreature,
            cardId,
        })
        this.render()
    }

    onMouseOverArtifact(e: MouseEvent, target: Card) {
        const texture = target.front
        this.showEnlargedCard(texture)
        this.artifactMousingOver = target
    }

    onMouseOutArtifact() {
        this.artifactMousingOver = undefined

        if (this.cardHoverImage) {
            this.cardHoverImage.destroy()
            this.cardHoverManualIndicator!.destroy()
        }
    }

    onClickArtifact(e: MouseEvent, card: Card) {
        const cardId = card.id

        if (this.keysDown[KeyCodes.B]) {
            this.dispatch({
                type: GameEvent.DiscardCard,
                cardId,
            })
            this.render()
            return
        }

        if (this.keysDown[KeyCodes.M]) {
            this.dispatch({
                type: GameEvent.MoveArtifactToHand,
                cardId,
            })
            this.render()
            return
        }

        if (this.keysDown[KeyCodes.A]) {
            this.dispatch({
                type: GameEvent.AddAmberToCard,
                cardId,
                amount: e.button === 2 ? -1 : 1
            })
            this.render()
            return
        }

        this.dispatch({
            type: GameEvent.UseArtifact,
            cardId,
        })
        this.render()
    }

    onClickCardInHand(e: MouseEvent, card: Card) {
        const dispatch = this.dispatch
        const cardId = card.id

        if (this.keysDown[KeyCodes.B]) {
            dispatch({
                type: GameEvent.DiscardCard,
                cardId,
            })
            this.render()
            return
        }

        this.render()
    }

    onMouseOverCardInHand(e: MouseEvent, target: Card) {
        const texture = target.front
        this.showEnlargedCard(texture)
        this.cardInHandMousingOver = target
    }

    onMouseOutCardInHand() {
        this.cardInHandMousingOver = undefined

        if (this.cardHoverImage) {
            this.cardHoverImage.destroy()
            this.cardHoverManualIndicator!.destroy()
        }
    }

    onDragEndCardInHand(card: Card) {
        const distY = card._originY - card.y
        if (distY > CARD_HEIGHT) {
            const cardId = card.id
            this.dispatch({
                type: GameEvent.PlayAction,
                cardId,
            })
            this.render()
        } else {
            this.render()
        }
    }

    onMouseOverUpgrade(e: MouseEvent, target: Card) {
        const texture = target.data.get("front")
        this.showEnlargedCard(texture)
        this.creatureMousingOver = target
    }

    onMouseOutUpgrade() {
        this.creatureMousingOver = undefined

        if (this.cardHoverImage) {
            this.cardHoverImage.destroy()
            this.cardHoverManualIndicator!.destroy()
        }
    }

    onDragStart() {
        this.creatureMousingOver = undefined
        this.artifactMousingOver = undefined
        this.cardInHandMousingOver = undefined

        if (this.cardHoverImage) {
            this.cardHoverImage.destroy()
            this.cardHoverManualIndicator!.destroy()
        }
    }

    showEnlargedCard(texture: string) {
        if (texture === ImageKey.CARDBACK)
            return
        const width = 220
        const height = width / .716612378
        const image = new Phaser.GameObjects.Image(this, this.width - width / 2 - 10, height / 2 + 10, texture + "-hover")
        image.setDisplaySize(width, height)

        this.root!.add(image)
        this.cardHoverImage = image

        const script = cardScripts.scripts.get(texture)
        this.cardHoverManualIndicator = new Phaser.GameObjects.Text(this, this.width - 97, 10, "---------", {
            color: script !== undefined ? "#77dd77" : "#e03f3f",
            backgroundColor: script !== undefined ? "#77dd77" : "#e03f3f",
            fontSize: "16px"
        })
        this.root!.add(this.cardHoverManualIndicator)
    }

    setupKeyboardListeners() {
        this.input.keyboard.on("keydown", (e: MouseEvent) => {
            this.keysDown[e.which] = true
        })

        this.input.keyboard.on("keyup", (e: MouseEvent) => {
            this.keysDown[e.which] = false
        })
    }
}

export default GameScene
