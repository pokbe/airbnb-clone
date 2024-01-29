import { createContext, useEffect, useState } from "react";
import axios from "axios";

export const UserContext = createContext({});

export function UserContextProvider({ children }) {
    const [user,setUser] = useState(null);
    const [ready,setReady] = useState(false);
    //有的时候用户直接进主页，会没有信息，这个时候如果token有效，可以直接用请求nodejs获取对应信息，若无效，则不能请求
    useEffect(() => {
        if (!user) {
            axios.get('/profile').then(({data}) => {
              setUser(data);
              setReady(true);
            });
          }
    }, [])

    return (
        <UserContext.Provider  value={{user, setUser, ready}}>
            {children}
        </UserContext.Provider>
    )

}