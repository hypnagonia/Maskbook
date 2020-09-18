import React from 'react'
import { Typography, Card, List, Paper } from '@material-ui/core'
import { makeStyles, createStyles, ThemeProvider, Theme, useTheme } from '@material-ui/core/styles'

import { SettingsUI, SettingsUIEnum, SettingsUIDummy } from '../../../components/shared-settings/useSettingsUI'
import {
    debugModeSetting,
    disableOpenNewTabInBackgroundSettings,
    languageSettings,
    Language,
    renderInShadowRootSettings,
    allPostReplacementSettings,
    currentLocalWalletEthereumNetworkSettings,
    appearanceSettings,
    Appearance,
} from '../../../settings/settings'
import { useValueRef } from '../../../utils/hooks/useValueRef'

import TrendingUpIcon from '@material-ui/icons/TrendingUp'
import EnhancedEncryptionIcon from '@material-ui/icons/EnhancedEncryption'
import NoEncryptionIcon from '@material-ui/icons/NoEncryption'
import MemoryOutlinedIcon from '@material-ui/icons/MemoryOutlined'
import ArchiveOutlinedIcon from '@material-ui/icons/ArchiveOutlined'
import UnarchiveOutlinedIcon from '@material-ui/icons/UnarchiveOutlined'
import FlipToFrontIcon from '@material-ui/icons/FlipToFront'
import TabIcon from '@material-ui/icons/Tab'
import PaletteIcon from '@material-ui/icons/Palette'
import LanguageIcon from '@material-ui/icons/Language'
import WifiIcon from '@material-ui/icons/Wifi'
import DashboardRouterContainer from './Container'
import { useI18N } from '../../../utils/i18n-next-ui'
import { merge, cloneDeep } from 'lodash-es'
import { useModal } from '../DashboardDialogs/Base'
import { EthereumNetwork } from '../../../plugins/Wallet/database/types'
import { DashboardBackupDialog, DashboardRestoreDialog } from '../DashboardDialogs/Backup'
import { Flags } from '../../../utils/flags'
import { currentDataProviderSettings } from '../../../plugins/Trader/settings'
import { resolveDataProviderName } from '../../../plugins/Trader/pipes'
import { DataProvider } from '../../../plugins/Trader/types'

const useStyles = makeStyles((theme) =>
    createStyles({
        root: {
            width: '100%',
            maxWidth: 360,
            backgroundColor: theme.palette.background.paper,
        },
        title: {
            fontWeight: 'normal',
            lineHeight: '30px',
            marginBottom: theme.spacing(1.5),
            [theme.breakpoints.down('xs')]: {
                marginBottom: 0,
            },
        },
        section: {
            padding: '26px 40px',
            margin: theme.spacing(3, 0),
            [theme.breakpoints.down('xs')]: {
                padding: theme.spacing(2),
            },
        },
        secondaryAction: {
            paddingRight: 90,
        },
        list: {
            [theme.breakpoints.down('xs')]: {
                marginLeft: theme.spacing(-2),
                marginRight: theme.spacing(-2),
            },
        },
        listItemRoot: {
            paddingTop: theme.spacing(1.5),
            paddingBottom: theme.spacing(1.5),
            borderBottom: `1px solid ${theme.palette.divider}`,
        },
        listItemIcon: {
            color: theme.palette.text.primary,
            justifyContent: 'flex-start',
            minWidth: 'unset',
            marginLeft: 0,
            marginRight: theme.spacing(3),
            [theme.breakpoints.down('xs')]: {
                display: 'none',
            },
        },
    }),
)

const settingsTheme = (theme: Theme): Theme =>
    merge(cloneDeep(theme), {
        wrapper: {
            padding: theme.spacing(0, 3),
        },
        typography: {
            body1: {
                lineHeight: 1.75,
            },
        },
        overrides: {
            MuiPaper: {
                rounded: {
                    borderRadius: 12,
                },
            },
            MuiCard: {
                root: {
                    overflow: 'visible',
                },
            },
            MuiOutlinedInput: {
                input: {
                    paddingTop: theme.spacing(1),
                    paddingBottom: theme.spacing(1),
                },
            },
        },
    })

export default function DashboardSettingsRouter() {
    const { t } = useI18N()
    const currentLang = useValueRef(languageSettings)
    const currentApperance = useValueRef(appearanceSettings)
    const langMapper = React.useRef((x: Language) => {
        if (x === Language.en) return t('language_en')
        if (x === Language.zh) return t('language_zh')
        if (x === Language.ja) return t('language_ja')
        return x
    }).current
    const apperanceMapper = React.useRef((x: Appearance) => {
        if (x === Appearance.dark) return t('settings_appearance_dark')
        if (x === Appearance.light) return t('settings_appearance_light')
        return t('settings_appearance_default')
    }).current

    const classes = useStyles()
    const shadowRoot = useValueRef(renderInShadowRootSettings)
    const theme = useTheme()
    const elevation = theme.palette.type === 'dark' ? 1 : 0

    const [backupDialog, openBackupDialog] = useModal(DashboardBackupDialog)
    const [restoreDialog, openRestoreDialog] = useModal(DashboardRestoreDialog)

    const listStyle = {
        secondaryAction: classes.secondaryAction,
        listItemRoot: classes.listItemRoot,
        listItemIcon: classes.listItemIcon,
    }
    return (
        <DashboardRouterContainer title={t('settings')}>
            <div className="wrapper">
                <ThemeProvider theme={settingsTheme}>
                    <Paper component="section" className={classes.section} elevation={elevation}>
                        <Typography className={classes.title} variant="h6" color="textPrimary">
                            {t('settings_title_general')}
                        </Typography>
                        <Card elevation={0}>
                            <List className={classes.list} disablePadding>
                                <SettingsUIEnum
                                    classes={listStyle}
                                    secondary={langMapper(currentLang)}
                                    enumObject={Language}
                                    getText={langMapper}
                                    icon={<LanguageIcon />}
                                    value={languageSettings}
                                />
                                <SettingsUIEnum
                                    classes={listStyle}
                                    secondary={apperanceMapper(currentApperance)}
                                    enumObject={Appearance}
                                    getText={apperanceMapper}
                                    icon={<PaletteIcon />}
                                    value={appearanceSettings}
                                />
                                {Flags.support_eth_network_switch ? (
                                    <SettingsUIEnum
                                        classes={listStyle}
                                        enumObject={EthereumNetwork}
                                        icon={<WifiIcon />}
                                        value={currentLocalWalletEthereumNetworkSettings}
                                    />
                                ) : null}

                                {/* TODO: A singe 'Plugins' tab should be added for listing plugin bio and settings. */}
                                <SettingsUIEnum
                                    classes={listStyle}
                                    enumObject={DataProvider}
                                    getText={resolveDataProviderName}
                                    icon={<TrendingUpIcon />}
                                    value={currentDataProviderSettings}
                                />
                            </List>
                        </Card>
                    </Paper>

                    <Paper component="section" className={classes.section} elevation={elevation}>
                        <Typography className={classes.title} variant="h6" color="textPrimary">
                            {t('settings_title_advanced_options')}
                        </Typography>
                        <Card elevation={0}>
                            <List className={classes.list} disablePadding>
                                <SettingsUI
                                    classes={listStyle}
                                    icon={<TabIcon />}
                                    value={disableOpenNewTabInBackgroundSettings}
                                />
                                {Flags.no_ShadowDOM_support ? null : (
                                    <SettingsUI
                                        classes={listStyle}
                                        icon={shadowRoot ? <EnhancedEncryptionIcon /> : <NoEncryptionIcon />}
                                        value={renderInShadowRootSettings}
                                    />
                                )}
                                <SettingsUI
                                    classes={listStyle}
                                    icon={<MemoryOutlinedIcon />}
                                    value={debugModeSetting}
                                />
                                <SettingsUI
                                    classes={listStyle}
                                    icon={<FlipToFrontIcon />}
                                    value={allPostReplacementSettings}
                                />
                            </List>
                        </Card>
                    </Paper>

                    <Paper component="section" className={classes.section} elevation={elevation}>
                        <Typography className={classes.title} variant="h6" color="textPrimary">
                            {t('settings_title_database_management')}
                        </Typography>
                        <Card elevation={0}>
                            <List className={classes.list} disablePadding>
                                <SettingsUIDummy
                                    classes={listStyle}
                                    icon={<UnarchiveOutlinedIcon />}
                                    primary={t('backup_database')}
                                    secondary={t('dashboard_backup_database_hint')}
                                    onClick={openBackupDialog}
                                />
                                <SettingsUIDummy
                                    classes={listStyle}
                                    icon={<ArchiveOutlinedIcon />}
                                    primary={t('restore_database')}
                                    secondary={t('dashboard_import_database_hint')}
                                    onClick={openRestoreDialog}
                                />
                            </List>
                        </Card>
                        {backupDialog}
                        {restoreDialog}
                    </Paper>
                </ThemeProvider>
            </div>
        </DashboardRouterContainer>
    )
}
