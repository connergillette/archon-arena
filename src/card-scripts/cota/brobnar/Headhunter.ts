import { CardScript } from "../../types/CardScript"
import { cardScripts } from "../../CardScripts"
import {activePlayerState, modifyAmber} from "../../ScriptUtils"

const cardScript: CardScript = {
    power: () => 5,
    fight: {
        perform: (state) => {
            modifyAmber(activePlayerState(state), 1)
        }
    }
}

cardScripts.scripts.set("headhunter", cardScript)
