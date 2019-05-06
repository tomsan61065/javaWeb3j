//https://ithelp.ithome.com.tw/articles/10196136
package org.web3j.merge;

import org.springframework.stereotype.Component;

@Component
public class MemberAccount{

    private int id;
    private String email;
    private String cellphone;
    private String password;
    private String address;
    
    public int getId() {
        return id;
    }
    
    public void setId(int id) {
        this.id = id;
    }
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getCellphone() {
        return cellphone;
    }
    
    public void setCellphone(String cellphone) {
        this.cellphone = cellphone;
    }
    
    public String getPassword() {
        return password;
    }
    
    public void setPassword(String password) {
        this.password = password;
    }
    
    public String getAddress() {
        return address;
    }
    
    public void setAddress(String address) {
        this.address = address;
    }

}