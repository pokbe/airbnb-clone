import PhotosUploader from "../components/PhotosUploader"
import Perks from "../components/Perks";
import { useEffect, useState } from "react"
import axios from "axios"
import AccountNav from "../components/AccountNav";
import { Navigate, useParams } from "react-router-dom";

export default function PlacesFromPage() {
    const {id} = useParams()
    const [title, setTitle] = useState('')
    const [addedPhotos, setAddedPhotos] = useState([])
    const [address, setAddress] = useState('')
    const [description, setDescription] = useState('')
    const [perks, setPerks] = useState([]);
    const [extraInfo, setExtraInfo] = useState('');
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [maxGuests, setMaxGuests] = useState(1);
    const [price, setPrice] = useState(100);
    const [redirect, setRedirect] = useState(false);

    useEffect(() => {
        if (!id) {
            return;
        }
        axios.get('/places/' + id)
        .then(response => {
            const {data} = response
            setTitle(data.title);
            setAddress(data.address);
            setAddedPhotos(data.photos);
            setDescription(data.description);
            setPerks(data.perks);
            setExtraInfo(data.extraInfo);
            setCheckIn(data.checkIn);
            setCheckOut(data.checkOut);
            setMaxGuests(data.maxGuests);
            setPrice(data.price);
        })
    }, [id])

    function inputHeader(text) {
        return (
            <h2 className="text-2xl mt-4">{text}</h2>
        );
    }

    function inputDescription(text) {
        return (
            <p className="text-gray-500 text-sm">{text}</p>
        );
    }

    //归一化所有标题和副标题
    function preInput(header, description) {
        return (
            <>
                {inputHeader(header)}
                {inputDescription(description)}
            </>
        );
    }


    async function savePlace(ev) {
        ev.preventDefault()
        const placeData = {title, address, addedPhotos, description, perks, extraInfo, checkIn, checkOut, maxGuests, price}
        if (id) {
            await axios.put('/places', {id, ...placeData})
            setRedirect(true)
        } else {
            await axios.post('/places', placeData)
            setRedirect(true)
        }
    }

    if (redirect) {
        return (
            <Navigate to={'/account/places'}/>
        )
    }

    return (
        <div>
            <AccountNav/>
            <form onSubmit={savePlace}>
                {preInput("Title", "给自己的地点加一些描述，请尽量简短")}
                <input type='text' value={title} onChange={ev => setTitle(ev.target.value)} placeholder="title, for example: My lovely apartment" />
                {preInput("Address", "详细地址")}
                <input type='text' value={address} onChange={ev => setAddress(ev.target.value)} placeholder="address" />
                {preInput("Photos", "详细图片")}
                <PhotosUploader addedPhotos={addedPhotos} onChange={setAddedPhotos} />
                {preInput("Description", "关于地点的详细描述")}
                <textarea value={description} onChange={ev => setDescription(ev.target.value)} />
                {preInput("Perks", "选择你的地点的全部优点")}
                <div className="grid mt-2 gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                    <Perks selected={perks} onChange={setPerks} />
                </div>
                {preInput("Extra Info", "房屋使用规范等等")}
                <textarea value={extraInfo} onChange={ev => setExtraInfo(ev.target.value)} />
                {preInput("Check in&out times, max guests", "add check in and out times")}
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                    <div>
                        <h3 className="mt-2 -mb-1">Check in time</h3>
                        <input type="text" value={checkIn} onChange={ev => setCheckIn(ev.target.value)} placeholder="14" />
                    </div>
                    <div>
                        <h3 className="mt-2 -mb-1">Check out time</h3>
                        <input type="text" value={checkOut} onChange={ev => setCheckOut(ev.target.value)} placeholder="11" />
                    </div>
                    <div>
                        <h3 className="mt-2 -mb-1">Max number of guests</h3>
                        <input type="number" value={maxGuests} onChange={ev => setMaxGuests(ev.target.value)} placeholder="2" />
                    </div>
                    <div>
                        <h3 className="mt-2 -mb-1">Price per night</h3>
                        <input type="number" value={price} onChange={ev => setPrice(ev.target.value)} placeholder="2" />
                    </div>
                </div>
                <div className="primary my-4">
                    <button className="primary">Save</button>
                </div>
            </form>
        </div>
    )
}