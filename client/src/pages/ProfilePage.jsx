import { useContext, useState } from "react"
import { UserContext } from "../components/UserContext"
import { Link, Navigate, useParams } from "react-router-dom"
import AccountNav from "../components/AccountNav"
import axios from "axios"
import PlacesPage from "./PlacesPage"

export default function ProfilePage() {
    const { user, ready, setUser } = useContext(UserContext)
    const [redirect, setRedirect] = useState(null)
    let { subpage } = useParams()

    if (subpage === undefined) {
        subpage = 'profile'
    }

    async function logout() {
        await axios.post('/logout')
        setUser(null)
        setRedirect('/')
    }

    if (!ready) {
        return 'Loadding...'
    }

    if (ready && !user && !redirect) {
        return <Navigate to={'/login'} />
    }

    if (redirect) {
        return <Navigate to={redirect} />
    }

    return (
        <div>
            <AccountNav />
            {
                subpage === 'profile' && (
                    <div className="text-center max-w-lg mx-auto">
                        Logged in as {user.name} ({user.email})
                        <button onClick={logout} className="primary max-w-sm mt-2">Logout</button>
                    </div>
                )
            }
            {
                subpage === 'places' && (
                    <div>
                        <PlacesPage />
                    </div>
                )
            }
        </div>
    )
}