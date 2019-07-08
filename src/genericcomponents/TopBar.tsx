import { AppBar, Button, Toolbar } from "@material-ui/core"
import { observer } from "mobx-react"
import * as React from "react"
import { theme } from "../index"
import { Routes } from "../routing/Routes"
import { authStore } from "../stores/AuthStore"
import { playerStore } from "../stores/PlayerStore"
import { log } from "../Utils"
import { LinkButton } from "./LinkButton"

@observer
export class TopBar extends React.Component {
    render() {
        log.debug("Player display name: " + playerStore.player.displayName)
        return (
            <AppBar position={"static"}>
                <Toolbar>

                    <div style={{flexGrow: 1}}/>
                    {playerStore.userLoaded && (!playerStore.player.displayName || !playerStore.player.activeDeck) ? (
                        <LinkButton
                            color={"secondary"}
                            variant={"contained"}
                            style={{marginRight: theme.spacing(2)}}
                            to={Routes.profile}
                        >
                            Add your profile info!
                        </LinkButton>
                    ) : null}
                    {authStore.authUser ? (
                        <>
                            <LinkButton color={"inherit"} style={{marginRight: theme.spacing(2)}} to={Routes.lobby}>
                                Game Lobby
                            </LinkButton>
                            <LinkButton color={"inherit"} style={{marginRight: theme.spacing(2)}} to={Routes.profile}>
                                {playerStore.player.displayName ? playerStore.player.displayName : "My Profile"}
                            </LinkButton>
                            <Button color={"inherit"} onClick={authStore.logout}>Logout</Button>
                        </>
                    ) : (
                        <LinkButton color="inherit" to={Routes.login}>Login or Signup</LinkButton>
                    )}
                </Toolbar>
            </AppBar>
        )
    }
}